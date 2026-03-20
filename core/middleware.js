import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";

const IS_DEV = process.env.NODE_ENV === "development";

export function attachBaseMiddleware(app) {
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    // Safety headers and CORS
    app.use(helmet({
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                scriptSrc: IS_DEV
                    ? ["'self'", "'unsafe-eval'"]
                    : ["'self'"]
            }
        },
        crossOriginResourcePolicy: {
            policy: IS_DEV ? "cross-origin" : "same-origin"
        }
    }));

    // CSP report-only header for readiness gate checks
    app.use((req, res, next) => {
        res.setHeader('Content-Security-Policy-Report-Only', "default-src 'self'");
        next();
    });

    const CORS_ORIGINS = (process.env.CORS_ORIGINS || "")
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

    const corsOptions = {
        origin: function (origin, callback) {
            if (!origin) return callback(null, true);
            if (CORS_ORIGINS.length === 0) return callback(null, true);
            return callback(null, CORS_ORIGINS.includes(origin));
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Key"]
    };

    app.use(cors(corsOptions));
    app.options(/.*$/, cors(corsOptions));

    if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test' && !process.env.MOCHA) {
        app.use("/__test", (req, res) => res.status(404).send("Not Found"));
    }
}
