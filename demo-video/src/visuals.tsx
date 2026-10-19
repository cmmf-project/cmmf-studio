import React from "react";
import {
  AbsoluteFill,
  Img,
  Interactive,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  delayRender,
  continueRender,
  cancelRender,
  type InteractivitySchema,
} from "remotion";
import { Video } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import media from "./media-data.json";

const fontHandle = delayRender("Load bundled Studio fonts");
Promise.all([
  loadFont({
    family: "Source Sans 3",
    url: staticFile("fonts/source-sans-3-latin-400-normal.woff2"),
    weight: "400",
  }),
  loadFont({
    family: "Source Sans 3",
    url: staticFile("fonts/source-sans-3-latin-600-normal.woff2"),
    weight: "600",
  }),
  loadFont({
    family: "Reem Kufi",
    url: staticFile("fonts/reem-kufi-latin-500-normal.woff2"),
    weight: "500",
  }),
])
  .then(() => continueRender(fontHandle))
  .catch(cancelRender);

export const Frame = ({
  chapter,
  title,
  detail,
  children,
}: {
  chapter: string;
  title: string;
  detail: string;
  children: React.ReactNode;
}) => (
  <AbsoluteFill
    style={{
      background: "#F6F7F3",
      color: "#192329",
      fontFamily: '"Source Sans 3", sans-serif',
    }}
  >
    <Img
      src={staticFile("studio-logo.svg")}
      style={{ position: "absolute", left: 80, top: 34, width: 260 }}
    />
    <div
      style={{
        position: "absolute",
        left: 80,
        top: 108,
        fontSize: 22,
        color: "#667177",
        letterSpacing: 2,
        textTransform: "uppercase",
      }}
    >
      {chapter}
    </div>
    <div
      style={{
        position: "absolute",
        right: 80,
        top: 42,
        fontSize: 20,
        color: "#667177",
      }}
    >
      Studio demo · edited capture
    </div>
    {children}
    <div
      style={{
        position: "absolute",
        left: 80,
        right: 80,
        bottom: 38,
        borderTop: "1px solid #D9DFDA",
        paddingTop: 20,
        background: "#F6F7F3",
      }}
    >
      <div style={{ fontSize: 42, lineHeight: 1.12, fontWeight: 600 }}>
        {title}
      </div>
      <div
        style={{
          fontSize: 25,
          lineHeight: 1.4,
          color: "#667177",
          marginTop: 8,
        }}
      >
        {detail}
      </div>
    </div>
  </AbsoluteFill>
);

type FootageProps = {
  clip: keyof typeof media;
  speed?: number;
  offset?: number;
  crop?: { x: number; y: number; width: number; height: number };
  style?: React.CSSProperties;
};
export const Footage = ({
  clip,
  speed = 1,
  offset = 0,
  crop,
  style,
}: FootageProps) => {
  const { fps, durationInFrames } = useVideoConfig();
  const m = media[clip];
  const live = Math.min(
    durationInFrames,
    Math.floor(((m.cleanDuration - offset) / speed) * fps) - 1,
  );
  const dimensions = crop || { x: 0, y: 0, width: 1920, height: 1080 };
  const scale = 100 / dimensions.width;
  const childStyle: React.CSSProperties = {
    position: "absolute",
    width: `${1920 * scale}%`,
    height: "auto",
    left: `${-dimensions.x * scale}%`,
    top: `${(-dimensions.y / dimensions.height) * 100}%`,
  };
  return (
    <div
      style={{
        position: "absolute",
        overflow: "hidden",
        background: "#F6F7F3",
        ...style,
      }}
    >
      <Sequence
        name="Recorded interactions"
        durationInFrames={Math.max(1, live)}
        premountFor={fps}
      >
        <Video
          name="Studio recording"
          src={staticFile(`recordings/${clip}.webm`)}
          trimBefore={(m.trim + offset) * fps}
          playbackRate={speed}
          muted
          premountFor={fps}
          style={childStyle}
        />
      </Sequence>
      {live < durationInFrames && (
        <Sequence name="Read the final state" from={live} premountFor={fps}>
          <Img src={staticFile(`stills/${clip}.png`)} style={childStyle} />
        </Sequence>
      )}
    </div>
  );
};

type CalloutProps = { children: string; style?: React.CSSProperties };
const CalloutInner = ({ children, style }: CalloutProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Interactive.Div
      style={{
        position: "absolute",
        left: 90,
        top: 165,
        padding: "10px 20px",
        borderLeft: "5px solid #945D9C",
        background: "#fff",
        boxShadow: "0 4px 18px #1923290b",
        borderRadius: 6,
        fontFamily: '"Source Sans 3", sans-serif',
        fontSize: 28,
        fontWeight: 600,
        color: "#192329",
        opacity: interpolate(frame, [0, 0.3 * fps], [0, 1], {
          extrapolateRight: "clamp",
        }),
        ...style,
      }}
    >
      {children}
    </Interactive.Div>
  );
};
export const Callout = Interactive.withSchema({
  Component: CalloutInner,
  componentName: "Decision callout",
  schema: {
    children: {
      type: "text-content",
      default: "At least one variant",
      description: "Decision",
    },
  } satisfies InteractivitySchema,
  wrapInSequence: true,
});

export const FocusedPair = ({
  clip,
}: {
  clip: "06-variants" | "07-categories" | "08-localisation";
}) => {
  const { fps } = useVideoConfig();
  const reveal = clip === "08-localisation" ? 2 : 6;
  return (
    <>
      <Footage
        clip={clip}
        crop={{ x: 420, y: 390, width: 840, height: 380 }}
        style={{
          left: 80,
          top: 265,
          width: 1190,
          height: 538,
          borderRadius: 12,
          border: "1px solid #D9DFDA",
        }}
      />
      <Sequence
        name="Open the decision inspector"
        from={reveal * fps}
        premountFor={fps}
      >
        <Footage
          clip={clip}
          offset={reveal}
          crop={{ x: 1510, y: 173, width: 354, height: 592 }}
          style={{
            left: 1370,
            top: 157,
            width: 460,
            height: 769,
            borderRadius: 12,
            border: "1px solid #D9DFDA",
          }}
        />
      </Sequence>
    </>
  );
};
