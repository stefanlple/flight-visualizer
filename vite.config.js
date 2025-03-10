import { loadEnv } from "vite";
import vitePluginString from "vite-plugin-string";

export default ({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const backendUrl = env.VITE_BACKEND_URL || "http://localhost:5001";

    return {
        plugins: [vitePluginString()],
        server: {
            proxy: {
                "/api": {
                    target: backendUrl,
                    changeOrigin: true,
                },
            },
        },
    };
};
