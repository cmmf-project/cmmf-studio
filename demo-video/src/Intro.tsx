import React from "react";
import { Series, useVideoConfig } from "remotion";
import { Frame, Footage } from "./visuals";

const PlaceConcepts = () => (
  <Frame
    chapter="01 / Start simply"
    title="A familiar space to brainstorm ideas"
    detail="Drag and drop to add models just as easily as with a whiteboard."
  >
    <Footage
      clip="01-concepts"
      speed={2.4}
      crop={{ x: 0, y: 80, width: 1920, height: 920 }}
      style={{ left: 80, top: 145, width: 1760, height: 843 }}
    />
  </Frame>
);
const AddFields = () => (
  <Frame
    chapter="01 / Start simply"
    title="Build out your model with typed fields"
    detail="Add fields and fill out your content types. The canvas expands with you."
  >
    <Footage
      clip="02-fields"
      speed={1.9}
      crop={{ x: 0, y: 80, width: 1920, height: 920 }}
      style={{ left: 80, top: 145, width: 1760, height: 843 }}
    />
  </Frame>
);
export const Intro = () => {
  const { fps } = useVideoConfig();
  return (
    <Series>
      <Series.Sequence
        name="Place the concepts — accelerated"
        durationInFrames={10 * fps}
        premountFor={fps}
      >
        <PlaceConcepts />
      </Series.Sequence>
      <Series.Sequence
        name="Add fields — accelerated"
        durationInFrames={12 * fps}
        premountFor={fps}
      >
        <AddFields />
      </Series.Sequence>
    </Series>
  );
};
