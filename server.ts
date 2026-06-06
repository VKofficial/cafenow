import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Supabase Admin client securely using service role key
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co").trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  const supabaseAdmin = serviceRoleKey 
    ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
    : null;

  // Utility to authenticate incoming bearer token from client
  async function getAuthenticatedUser(req: express.Request) {
    if (!supabaseAdmin) {
      throw new Error("Supabase is not configured on the server. VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Missing or invalid Authorization header");
    }
    const token = authHeader.split(" ")[1];
    
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      throw new Error("Unauthorized session: " + (error?.message || "User not found"));
    }
    return user;
  }

  // API Route: Secure Club & Operator Admin Provisioning Flow
  app.post("/api/admin/create-club-and-admin", async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase Server Admin is not configured. Define VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." });
      }

      const { clubName, subscriptionPlan, adminEmail, adminPassword, superAdminOwnerId } = req.body;

      if (!clubName || !adminEmail || !adminPassword) {
        return res.status(400).json({ error: "Missing required fields (clubName, adminEmail, adminPassword)" });
      }

      // Validate subscription plan values
      const validPlans = ["cafe_only", "snooker_only", "full"];
      const verifiedPlan = validPlans.includes(subscriptionPlan) ? subscriptionPlan : "full";

      // 1. Authenticate performing SaaS user
      const callerUser = await getAuthenticatedUser(req);
      
      // 2. Fetch performing user's profile to check permissions (super_admin or owner)
      const { data: callerProfile, error: profileErr } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", callerUser.id)
        .single();

      if (profileErr || !callerProfile) {
        return res.status(403).json({ error: "Access denied. Caller profile not found." });
      }

      const callerRole = callerProfile.role;
      if (callerRole !== "super_admin" && callerRole !== "owner") {
        return res.status(403).json({ error: "Forbidden. Only super_admin or owner can provision clubs." });
      }

      // Determine owner_id: owners force themselves, super_admins can choose or default to themselves
      let ownerId: string | null = null;
      if (callerRole === "owner") {
        ownerId = callerUser.id;
      } else if (callerRole === "super_admin") {
        ownerId = superAdminOwnerId || callerUser.id;
      }

      // 3. Create Admin user in Supabase Auth securely
      const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true
      });

      if (authErr || !authUser || !authUser.user) {
        return res.status(400).json({ error: `Auth creation failed: ${authErr?.message || "Unknown error"}` });
      }

      const newAdminId = authUser.user.id;

      // 4. Create the Club Record
      const { data: clubData, error: clubErr } = await supabaseAdmin
        .from("clubs")
        .insert([{
          name: clubName,
          owner_id: ownerId,
          subscription_plan: verifiedPlan,
          subscription_status: "active"
        }])
        .select("*")
        .single();

      if (clubErr || !clubData) {
        // Rollback Auth user if club table insertion fails
        await supabaseAdmin.auth.admin.deleteUser(newAdminId);
        return res.status(400).json({ error: `Club insertion failed: ${clubErr?.message}` });
      }

      const newClubId = clubData.id;

      // 5. Create Profile Record linking them together
      const { data: adminProfile, error: profileInsertErr } = await supabaseAdmin
        .from("profiles")
        .insert([{
          id: newAdminId,
          role: "club_admin",
          owner_id: ownerId,
          club_id: newClubId
        }])
        .select("*")
        .single();

      if (profileInsertErr) {
        // Rollback Club and Auth user if profile table insertion fails
        await supabaseAdmin.from("clubs").delete().eq("id", newClubId);
        await supabaseAdmin.auth.admin.deleteUser(newAdminId);
        return res.status(400).json({ error: `Admin profile mapping failed: ${profileInsertErr.message}` });
      }

      return res.status(200).json({
        success: true,
        club: clubData,
        profile: adminProfile
      });

    } catch (err: any) {
      console.error("Secure club-and-admin creation error:", err);
      return res.status(500).json({ error: err.message || "An unexpected server-side error occurred." });
    }
  });

  // API Route: Secure Owner Account Creation
  app.post("/api/admin/create-owner", async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase Server Admin is not configured. Define VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." });
      }

      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Missing required fields (email, password)" });
      }

      // 1. Authenticate caller
      const callerUser = await getAuthenticatedUser(req);
      
      // 2. Verify caller is super_admin
      const { data: callerProfile, error: profileErr } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", callerUser.id)
        .single();

      if (profileErr || !callerProfile || callerProfile.role !== "super_admin") {
        return res.status(403).json({ error: "Forbidden. Only super_admin can create owners." });
      }

      // 3. Create Auth User
      const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (authErr || !authUser || !authUser.user) {
        return res.status(400).json({ error: `Auth owner creation failed: ${authErr?.message}` });
      }

      const ownerId = authUser.user.id;

      // 4. Create Owner profile record
      const { data: uProfile, error: insertError } = await supabaseAdmin
        .from("profiles")
        .insert([{
          id: ownerId,
          role: "owner",
          owner_id: null,
          club_id: null
        }])
        .select("*")
        .single();

      if (insertError) {
        await supabaseAdmin.auth.admin.deleteUser(ownerId);
        return res.status(400).json({ error: `Owner profile insert failed: ${insertError.message}` });
      }

      return res.status(200).json({
        success: true,
        owner: uProfile
      });

    } catch (err: any) {
      console.error("Secure owner creation error:", err);
      return res.status(500).json({ error: err.message || "An unexpected server-side error occurred." });
    }
  });

  // API Route: Health
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Integrate Vite Dev Server in non-production mode, otherwise serve static files
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SaaS Hub] Full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
