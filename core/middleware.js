import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";

export function attachBaseMiddleware(app) {
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    // Safety headers and CORS
    app.use(helmet({
        contentSecurityPolicy: false, // UI might need specific CSP, handled in attachUI if needed
    }));
    app.use(cors());
}
