import Lottie from "lottie-react";
import loadingAnimation from "../assets/loading.json";

const GlobalLoader = () => {
    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/35 backdrop-blur-sm"
            role="status"
            aria-live="polite"
            aria-label="Loading"
        >
            <div className="flex flex-col items-center rounded-3xl bg-white/80 px-8 py-6 shadow-2xl">
                <Lottie
                    animationData={loadingAnimation}
                    loop
                    className="h-36 w-36 sm:h-44 sm:w-44"
                />
                <p className="text-sm font-medium tracking-wide text-slate-700">
                    Loading...
                </p>
            </div>
        </div>
    );
};

export default GlobalLoader;
