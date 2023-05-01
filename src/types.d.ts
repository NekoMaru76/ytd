import { Dispatch, PropsWithChildren, SetStateAction, useState } from "react";
import type { FFmpeg } from "ffmpeg.wasm";
import type { VideoStream } from "ytdl";

export type UseState<S> = [S, Dispatch<SetStateAction<S>>];
export type NullishUseState<S> = ReturnType<typeof useState<S>>;

type YTVideoFormat = VideoStream["format"];
export type VideoFormat = {
    qualityLabel: YTVideoFormat["qualityLabel"];
    quality: string;
    codec: string;
    mimeType: string;
    hasAudio: boolean;
    audio?: AudioFormat;
};
export type AudioFormat = {
    quality: NonNullable<YTVideoFormat["audioQuality"]>;
    codec: string;
    raw: YTVideoFormat;
};
export type Props = PropsWithChildren<{
    hardSub: UseState<string>;
    softSubs: UseState<string[]>;
    url: string;
    subs: UseState<string[]>;
    info: NullishUseState<VideoStream["info"]>;
    blob: NullishUseState<Blob>;
    out: NullishUseState<Blob>;
    isBusy: UseState<boolean>;
    opt: UseState<string>;
    message: UseState<string>;
    ffmpeg: FFmpeg;
    videoFormats: VideoFormat[];
    audioFormats: AudioFormat[];
    clear: () => void;
}>;
