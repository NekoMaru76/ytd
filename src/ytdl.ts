import type { VideoStream } from "ytdl";

export async function getInfo(url: string): Promise<VideoStream["info"]> {
    const res = await fetch(`/getInfo/${encodeURIComponent(url)}`);
    const json = await res.json();

    if (res.status === 200) return json;
    else throw json.message;
    
}

export async function getBlob(url: string, formatInfo: VideoStream["format"]): Promise<Blob> {
    const res = await fetch(`/download/${encodeURIComponent(url)}`, {
        body: JSON.stringify(formatInfo),
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        }
    });
    
    if (res.status === 200) {
        const file = await res.blob();

        return file.slice(0, file.size, formatInfo.mimeType)
    }
    
    throw new Error(JSON.parse(await res.text()).message);
}