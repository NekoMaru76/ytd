import { createFFmpeg } from "ffmpeg.wasm";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { VideoStream } from "ytdl";
import { getBlob, getInfo } from "./ytdl.ts";
import moment from "moment";
import "moment-duration-format";
import * as mime from "mime";

const ffmpeg = createFFmpeg(
    {
        log: true,
    },
);
const formatDuration = (ms: number) =>
    moment
        .duration(
            ms,
        )
        .format(
            "hh:mm:ss",
        )
        .padStart(
            4,
            "0:0",
        );

function Page() {
    const [
        info,
        setInfo,
    ] = useState<
        VideoStream[
            "info"
        ]
    >();
    const [
        blob,
        setBlob,
    ] = useState<
        Blob
    >();
    const [
        url,
        setURL,
    ] = useState(
        "",
    );
    const [
        isBusy,
        setIsBusy,
    ] = useState(
        false,
    );
    const [
        opt,
        setOpt,
    ] = useState(
        "",
    );
    const [
        hardSub,
        setHardSub,
    ] = useState(
        "",
    );
    const [
        isReady,
        setIsReady,
    ] = useState(
        false,
    );
    const [
        out,
        setOut,
    ] = useState<
        Blob
    >();
    const [
        softSubs,
        setSoftSubs,
    ] = useState<
        string[]
    >([]);
    const [
        subs,
        setSubs,
    ] = useState<
        string[]
    >([]);

    useEffect(
        () => {
            (async () => {
                await ffmpeg
                    .load();

                const fontBuf = await fetch(
                    "/public/Arial.ttf",
                )
                    .then(
                        (
                            res,
                        ) => res
                            .arrayBuffer(),
                    );

                ffmpeg
                    .FS(
                        "mkdir",
                        "/fonts",
                    );
                ffmpeg
                    .FS(
                        "writeFile",
                        `/fonts/Arial.ttf`,
                        new Uint8Array(
                            fontBuf,
                        ),
                    );
                setIsReady(
                    true,
                );
            })();
        },
        [],
    );

    const [
        message,
        setMessage,
    ] = useState(
        "Click Start to transcode",
    );
    const fetchInfo = async () => {
        setIsBusy(
            true,
        );

        try {
            setBlob(
                undefined,
            );
            setMessage(
                "Fetching the video info",
            );

            const info = await getInfo(
                url,
            );

            setMessage(
                "Fetching the subtitles",
            );

            const subs = info
                .player_response
                .captions
                ?.playerCaptionsTracklistRenderer
                .captionTracks;

            if (
                subs
            ) {
                const all: string[] = [];

                for (
                    const sub of subs
                ) {
                    setMessage(
                        `Fetching subtitle "${sub.name.simpleText} (${sub.languageCode})"`,
                    );
                    all
                        .push(
                            await fetch(
                                sub
                                    .baseUrl +
                                    "&fmt=vtt",
                            ).then(
                                (
                                    res,
                                ) => res
                                    .text(),
                            ),
                        );
                }

                setInfo(
                    info,
                );
                setSubs(
                    all,
                );
            }

            setMessage(
                "Finished",
            );
        } catch (e) {
            setMessage(
                `Error! ${e}`,
            );
        }

        setIsBusy(
            false,
        );
    };
    const download = async () => {
        setIsBusy(
            true,
        );

        try {
            if (
                !info
            ) {
                throw new Error(
                    "HOW",
                );
            }

            setMessage(
                "Downloading the video",
            );

            const format = info
                .formats[
                    parseInt(
                        opt,
                    )
                ];
            const blob = await getBlob(
                url,
                format,
            );

            setBlob(
                blob,
            );
            setMessage(
                "Finished",
            );
        } catch (e) {
            setMessage(
                `Error! ${e}`,
            );
        }

        setIsBusy(
            false,
        );
    };
    const clear = () => {
        const dir = ffmpeg
            .FS(
                "readdir",
                ".",
            )
            .filter(
                (
                    name,
                ) => ![
                    ".",
                    "..",
                    "tmp",
                    "home",
                    "dev",
                    "proc",
                    "fonts",
                ].includes(
                    name,
                ),
            );

        for (
            const file of dir
        ) {
            ffmpeg
                .FS(
                    "unlink",
                    file,
                );
        }
    };
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

            //const subType = ext.toLowerCase() === "mkv" ? "mov_text" : "srt";
            let exec = false;

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
                        `subtitles=${name}:fontsdir='/fonts/'`,
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
                "ultrafast",
                outName,
            ];
            await ffmpeg
                .run(
                    ...all,
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
        !isReady
            ? (
                <>
                    Loading ffmpeg-core.js
                </>
            )
            : (
                <>
                    {info
                        ? (
                            <p>
                                Title: {info
                                    .videoDetails
                                    .title}
                                <br />
                                Duration: {formatDuration(
                                    1000 *
                                        parseInt(
                                            info
                                                .videoDetails
                                                .lengthSeconds,
                                        ),
                                )}
                                <br />
                                URL:{" "}
                                <a
                                    href={info
                                        .formats[
                                            parseInt(
                                                opt,
                                            )
                                        ]?.url ||
                                        info
                                            .videoDetails
                                            .video_url}
                                >
                                    Link
                                </a>
                                <br />
                                <img
                                    src={info
                                        .videoDetails
                                        .thumbnails[
                                            0
                                        ].url}
                                    width={info
                                        .videoDetails
                                        .thumbnails[
                                            0
                                        ].width}
                                    height={info
                                        .videoDetails
                                        .thumbnails[
                                            0
                                        ].height}
                                >
                                </img>
                            </p>
                        )
                        : (
                            <>
                            </>
                        )}
                    {blob
                        ? (
                            <>
                                <video
                                    src={URL
                                        .createObjectURL(
                                            blob,
                                        )}
                                >
                                </video>
                            </>
                        )
                        : (
                            <>
                            </>
                        )}
                    <p>
                        {message}
                    </p>

                    URL:{" "}
                    <input
                        type="text"
                        value={url}
                        onChange={(
                            v,
                        ) => setURL(
                            v.target
                                .value,
                        )}
                    />
                    <button
                        disabled={isBusy}
                        onClick={fetchInfo}
                    >
                        Get Info
                    </button>
                    <br />
                    {info
                        ? (
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
                                    {info
                                        .formats
                                        .map(
                                            (
                                                format,
                                                i,
                                            ) => (
                                                <option
                                                    value={i}
                                                    disabled={!format.hasVideo || format.mimeType?.includes("webm")}
                                                >
                                                    {format
                                                        .qualityLabel} {format.mimeType} {format
                                                        .quality} 
                                                </option>
                                            ),
                                        )}
                                </select>
                                <select
                                    value={hardSub}
                                    onChange={(
                                        e,
                                    ) => setHardSub(
                                        e.target
                                            .value,
                                    )}
                                    className="form-select"
                                >
                                    <option
                                        value=""
                                        selected
                                    >
                                        Hard Subtitle
                                    </option>
                                    {info
                                        .player_response
                                        .captions
                                        ?.playerCaptionsTracklistRenderer
                                        .captionTracks
                                        .map(
                                            (
                                                track,
                                                i,
                                            ) => (
                                                <option
                                                    value={i}
                                                >
                                                    {track
                                                        .name
                                                        .simpleText} ({track
                                                        .languageCode})
                                                </option>
                                            ),
                                        )}
                                </select>
                                <fieldset>
                                    <legend>
                                        Select Soft Subtitles:
                                    </legend>

                                    {info
                                        .player_response
                                        .captions
                                        ?.playerCaptionsTracklistRenderer
                                        .captionTracks
                                        .map(
                                            (
                                                track,
                                                i,
                                            ) => (
                                                <>
                                                    <input
                                                        type="checkbox"
                                                        id={`ss-${i}`}
                                                        name="ss"
                                                        value={i}
                                                        onChange={(
                                                            e,
                                                        ) => {
                                                            if (
                                                                e.target
                                                                    .checked &&
                                                                !softSubs
                                                                    .includes(
                                                                        `${i}`,
                                                                    )
                                                            ) {
                                                                setSoftSubs(
                                                                    [
                                                                        ...softSubs,
                                                                        `${i}`,
                                                                    ],
                                                                );
                                                            } else if (
                                                                !e.target
                                                                    .checked &&
                                                                softSubs
                                                                    .includes(
                                                                        `${i}`,
                                                                    )
                                                            ) {
                                                                const ind =
                                                                    softSubs
                                                                        .indexOf(
                                                                            `${i}`,
                                                                        );

                                                                if (
                                                                    ind !==
                                                                        -1
                                                                ) {
                                                                    softSubs
                                                                        .splice(
                                                                            ind,
                                                                            1,
                                                                        );
                                                                    setSoftSubs(
                                                                        softSubs,
                                                                    );
                                                                }
                                                            }
                                                        }}
                                                        checked={softSubs
                                                            .includes(
                                                                `${i}`,
                                                            )}
                                                        multiple
                                                    />
                                                    {track
                                                        .name
                                                        .simpleText +
                                                        " (" +
                                                        track
                                                            .languageCode +
                                                        ")"}
                                                    <br />
                                                </>
                                            ),
                                        ) ||
                                        (
                                            <>
                                            </>
                                        )}
                                </fieldset>

                                <button
                                    disabled={isBusy ||
                                        !opt}
                                    onClick={download}
                                >
                                    Download
                                </button>
                                <br />
                            </>
                        )
                        : (
                            <>
                            </>
                        )}
                    <button
                        onClick={transcode}
                        disabled={isBusy ||
                            !(blob &&
                                info)}
                    >
                        Transcode
                    </button>
                    {out
                        ? (
                            <a
                                href={URL
                                    .createObjectURL(
                                        out,
                                    )}
                                download={`${info?.videoDetails.title}.${
                                    mime
                                        .extension(
                                            out
                                                .type,
                                        )
                                }`}
                            >
                                <button>
                                    Save
                                </button>
                            </a>
                        )
                        : (
                            <>
                            </>
                        )}
                </>
            )
    );
}

ReactDOM
    .render(
        React
            .createElement(
                Page,
            ),
        document
            .body,
    );
