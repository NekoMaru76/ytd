import moment from "moment";
import "moment-duration-format";

export const formatDuration = (ms: number) =>
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
