import ytdl, { getInfo, VideoStream } from "ytdl";
import ID from "./id.ts";
import { opine, serveStatic, json } from "opine";

const port = parseInt(Deno.env.get("PORT") || "8080");
const app = opine();

app.use((_, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    next();
})
app.use(json());
app.use("/public", serveStatic("./dist"));
app.get("/", (_, res) => res.redirect("/public"));
app.get("/getInfo/:url", async (req, res) => {
    const url = req.params["url"];

    if (typeof url !== "string") {
        return res.setStatus(400).send({ message: "URL is not a string" });
    }

    try {
        res.send(await getInfo(ID(url)));
    } catch (e) {
        res.setStatus(500).send({ message: e.message });
    }
});
app.post("/download/:url", async (req, res) => {
    const url = req.params["url"];
    const formatInfo: VideoStream["format"] = req.body;

    if (typeof url !== "string") {
        return res.setStatus(400).send({ message: "URL is not a string" });
    }

    try {
        const stream = await ytdl(ID(url), {
            format: formatInfo
        });
        
        res.send(stream);
    } catch (e) {
        res.setStatus(500).send({ message: e.message });
    }
});
app.listen({ port }, () => {
    console.log(`Listening at ${port}/`);
});