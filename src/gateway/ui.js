import express from "express";
import path from "path";

export function attachUI(app, db) {
    // 1. View Engine setup
    app.set("view engine", "ejs");
    app.set("views", path.join(process.cwd(), "views"));

    // 2. Static assets
    app.use(express.static(path.join(process.cwd(), "public")));
    // Optional: web/public if needed by Next.js assets
    app.use("/web", express.static(path.join(process.cwd(), "web/public")));

    // 3. Landing Routes
    // Root landing route
    app.get("/", (req, res) => {
        res.type("text/html").send(`
            <html>
                <body style="font-family: sans-serif; padding: 40px; text-align: center; background: #f9fafb;">
                    <h1 style="color: #111827;">Satelink Node</h1>
                    <p style="color: #4b5563;">API is active. Health: <a href="/health">/health</a></p>
                    <p style="color: #4b5563;">UI Dashboard: <a href="/ui">/ui</a></p>
                    <div style="margin-top: 20px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; display: inline-block; background: white;">
                        <code style="color: #3b82f6;">Status: Operational</code>
                    </div>
                </body>
            </html>
        `);
    });

    // Helper UI route listing
    app.get("/ui", (req, res) => {
        res.type("text/html").send(`
            <html>
                <body style="font-family: sans-serif; padding: 40px; background: #f9fafb;">
                    <h1 style="color: #111827;">Satelink UI Routes</h1>
                    <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
                        <ul style="line-height: 2;">
                            <li><a href="/ui/login" style="color: #2563eb; font-weight: 500;">Admin Login</a> (/ui/login)</li>
                            <li><a href="/ui/operator/0x123..." style="color: #2563eb; font-weight: 500;">Operator View</a> (/ui/operator/:wallet)</li>
                            <li><a href="/ui/builder/login" style="color: #2563eb; font-weight: 500;">Builder Login</a> (/ui/builder/login)</li>
                        </ul>
                    </div>
                    <hr style="margin: 30px 0; border: 0; border-top: 1px solid #e5e7eb;">
                    <p><a href="/" style="color: #6b7280; font-size: 0.875rem;">&larr; Back to Home</a></p>
                </body>
            </html>
        `);
    });
}
