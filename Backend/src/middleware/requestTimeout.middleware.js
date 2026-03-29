import { UPLOAD_TIMEOUT_MESSAGE, UPLOAD_TIMEOUT_MS } from "../utils/cloudinary.js";

const createRequestTimeoutMiddleware = (
    timeoutMs = UPLOAD_TIMEOUT_MS,
    timeoutMessage = UPLOAD_TIMEOUT_MESSAGE
) => {
    return (req, res, next) => {
        let timedOut = false;

        const timer = setTimeout(() => {
            timedOut = true;

            if (!res.headersSent) {
                res.status(408).json({
                    success: false,
                    message: timeoutMessage,
                    errors: []
                });
            }
        }, timeoutMs);

        const clearTimer = () => clearTimeout(timer);

        req.isTimedOut = () => timedOut;
        res.on("finish", clearTimer);
        res.on("close", clearTimer);

        next();
    };
};

export { createRequestTimeoutMiddleware };
