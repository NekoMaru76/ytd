import React from "react";
import "moment-duration-format";
import * as mime from "mime";
import { Props } from "./types.d.ts";
import type { AudioFormat, VideoFormat } from "./types.d.ts";
import { extension } from "mime";
import { getBlob } from "./ytdl.ts";

export default function VideoPage({
    hardSub: [hardSub],
    softSubs: [softSubs],
    subs: [subs],
    info: [info],
    blob: [blob],
    out: [_1, setOut],
    isBusy: [isBusy],
    opt: [opt, setOpt],
    message: [_2, setMessage],
    ffmpeg,
    url,
    videoFormats,
    clear,
}: Props) {
    const transcode = async () => {
        setMessage(
            "Start transcoding",
        );

        if (
            blob &&
            info
        ) {
            const ext = mime
                .extension(
                    blob
                        .type,
                ) ||
                "mp4";
            const name = `file.${ext}`;
            const outName = `out.${ext}`;
            const cmd = [];
            const inputs = [
                "-i",
                name,
            ];
            const maps = [
                "-map",
                `0`,
            ];
            const metadatas = [];

            const format = videoFormats[parseInt(opt)];
            //const subType = ext.toLowerCase() === "mkv" ? "mov_text" : "srt";
            let exec = false;

            if (!format.hasAudio && format.audio) {
                exec = true;
                const audioName = `audio.${
                    extension(format.audio.codec) || "mp4a"
                }`;
                const buf = await getBlob(url, format.audio.raw);

                ffmpeg.FS("writeFile", audioName, new Uint8Array(await buf.arrayBuffer()));
                inputs.push("-i", audioName);
                maps.push("-map", `${maps.length / 2}:a`);
            }

            ffmpeg
                .FS(
                    "writeFile",
                    name,
                    new Uint8Array(
                        await blob
                            .arrayBuffer(),
                    ),
                );

            for (
                let i = 0;
                i <
                    softSubs
                        .length;
                i++
            ) {
                const softSub = softSubs[
                    i
                ];
                const name = `${softSub}.vtt`;

                ffmpeg
                    .FS(
                        "writeFile",
                        name,
                        subs[
                            parseInt(
                                softSub,
                            )
                        ],
                    );
                inputs
                    .push(
                        "-i",
                        name,
                    );
                maps
                    .push(
                        "-map",
                        `${
                            maps
                                .length /
                            2
                        }`,
                    );
                metadatas
                    .push(
                        `-metadata:s:s:${
                            metadatas
                                .length /
                            2
                        }`,
                        `language=${
                            info
                                .player_response
                                .captions
                                ?.playerCaptionsTracklistRenderer
                                .captionTracks[
                                    parseInt(
                                        softSub,
                                    )
                                ].languageCode
                        }`,
                    );
            }

            cmd
                .push(
                    ...inputs,
                    ...maps,
                    ...metadatas,
                );

            if (
                hardSub
            ) {
                const name = `${hardSub}.vtt`;

                ffmpeg
                    .FS(
                        "writeFile",
                        name,
                        subs[
                            parseInt(
                                hardSub,
                            )
                        ],
                    );
                cmd
                    .push(
                        `-vf`,
                        `subtitles=${name}:fontsdir='/fonts'`,
                    );

                exec = true;
            }

            if (
                softSubs
                    .length
            ) {
                cmd
                    .push(
                        "-c:v",
                        "copy",
                        "-c:a",
                        "copy",
                        "-c:s",
                        "mov_text",
                    );
            }

            if (
                !softSubs
                    .length ||
                !exec
            ) {
                ffmpeg
                    .FS(
                        "writeFile",
                        outName,
                        new Uint8Array(
                            await blob
                                .arrayBuffer(),
                        ),
                    );
                //for easier to write purpose
            }

            const all = [
                ...cmd,
                "-c:v",
                "libx264",
                "-preset",
                `ultrafast`,
                "-map",
                "0",
            ];

            if (!format.hasAudio && format.audio) {
                all[all.length-1] += ":v";
                all.push("-map", "1:a");
            }

            await ffmpeg
                .run(
                    ...all,
                    outName
                );
            console
                .log(
                    all,
                );

            const data = ffmpeg
                .FS(
                    "readFile",
                    outName,
                );

            setOut(
                new Blob(
                    [
                        data
                            .buffer,
                    ],
                    {
                        type: blob
                            .type,
                    },
                ),
            );
        }

        setMessage(
            "Complete transcoding",
        );
        clear();
    };

    return (
        <>
            <select
                value={opt}
                onChange={(
                    e,
                ) => setOpt(
                    e.target
                        .value,
                )}
                className="form-select"
                id="format"
            >
                <option
                    value=""
                    selected
                >
                    Formats
                </option>
                {videoFormats
                    .map(
                        (
                            format,
                            i,
                        ) => (
                            <option
                                value={i}
                            >
                                {format
                                    .qualityLabel} {format.mimeType} {format
                                    .quality}{" "}
                                {!format.hasAudio && format.audio ? "" : " (No Audio)"}{" "}
                                {format.audio
                                    ? ` + ${format.audio.codec} ${format.audio.quality}`
                                    : ""}
                            </option>
                        ),
                    )}
            </select>
            <button
                onClick={transcode}
                disabled={isBusy ||
                    !(blob &&
                        info)}
            >
                Transcode
            </button>
        </>
    );
}
