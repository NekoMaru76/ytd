import { createFFmpeg } from "ffmpeg.wasm";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { VideoStream } from "ytdl";
import { getBlob, getInfo } from "./ytdl.ts";
import { formatDuration } from "./utils.ts";
import * as mime from "mime";
import VideoPage from "./video.tsx";
import type { AudioFormat, VideoFormat } from "./types.d.ts";

const ffmpeg = createFFmpeg(
    {
        log: true,
    },
);

function Page() {
    const [
        videoFormats,
        setVideoFormats,
    ] = useState<VideoFormat[]>([]);
    const [
        audioFormats,
        setAudioFormats,
    ] = useState<AudioFormat[]>([]);
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
    const [
        opt,
        setOpt,
    ] = useState(
        "",
    );

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

            const subs = info
                .player_response
                .captions
                ?.playerCaptionsTracklistRenderer
                .captionTracks;

            const videoFormats: VideoFormat[] = [];
            const audioFormats: AudioFormat[] = [];
            const noAudioVideoFormats: VideoFormat[] = [];

            for (
                const format of info.formats
            ) {
                const {
                    hasVideo,
                    hasAudio,
                    quality,
                    videoCodec,
                    qualityLabel,
                    audioCodec,
                    audioQuality,
                    mimeType,
                } = format;

                if (hasVideo) {
                    if (mimeType?.toLowerCase().includes("webm")) continue;

                    let videoFormat: VideoFormat = {
                        hasAudio,
                        quality,
                        qualityLabel,
                        codec: videoCodec as string,
                        mimeType: mimeType as string,
                    };

                    if (hasAudio) {
                        videoFormat = {
                            ...videoFormat,
                            audio: {
                                codec: audioCodec as string,
                                quality: audioQuality as AudioFormat["quality"],
                                raw: format
                            },
                        };

                        videoFormats.push(videoFormat);
                    } else noAudioVideoFormats.push(videoFormat);
                } else {
                    audioFormats.push({
                        codec: audioCodec as string,
                        quality: audioQuality as AudioFormat["quality"],
                        raw: format
                    });
                }
            }

            for (const videoFormat of noAudioVideoFormats) {
                if (videoFormat.hasAudio) continue;

                for (const audioFormat of audioFormats) {
                    //if (audioFormat.codec.includes("opus")) continue;

                    const newFormat = {
                        ...videoFormat
                    };

                    videoFormats.push({
                        ...newFormat,
                        audio: audioFormat
                    });
                }
            }

            if (
                subs
            ) {
                const all: string[] = [];

                for (
                    const sub of subs
                ) {
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

                setSubs(
                    all,
                );
            }

            setVideoFormats(videoFormats);
            setAudioFormats(audioFormats);
            setInfo(
                info,
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

    return isReady
        ? (
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
                                                            const ind = softSubs
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
                        <VideoPage
                            url={url}
                            videoFormats={videoFormats}
                            audioFormats={audioFormats}
                            clear={clear}
                            subs={[subs, setSubs]}
                            blob={[blob, setBlob]}
                            hardSub={[hardSub, setHardSub]}
                            softSubs={[softSubs, setSoftSubs]}
                            info={[info, setInfo]}
                            out={[out, setOut]}
                            isBusy={[isBusy, setIsBusy]}
                            message={[message, setMessage]}
                            ffmpeg={ffmpeg}
                            opt={[opt, setOpt]}
                        />
                    )
                    : <></>}
            </>
        )
        : (
            <>
                Loading ffmpeg-core.js
            </>
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
