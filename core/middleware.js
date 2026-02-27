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
        contentSecurityPolicy: false,
    }));

    const originStr = process.env.CORS_ORIGINS;
    if (originStr) {
        app.use(cors({ origin: originStr.split(',').map(s => s.trim()) }));
    } else if (process.env.NODE_ENV === 'development') {
        app.use(cors());
    } else {
        app.use(cors({ origin: process.env.FRONTEND_URL || false }));
    }

    if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test' && !process.env.MOCHA) {
        app.use("/__test", (req, res) => res.status(404).send("Not Found"));
    }
}
