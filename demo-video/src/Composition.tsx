import React from "react";
import { Sequence, useVideoConfig } from "remotion";
import { Frame, Footage, FocusedPair, Callout } from "./visuals";

export const EditorialComposition = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      <Sequence
        name="Language requirement"
        durationInFrames={18 * fps}
        premountFor={fps}
      >
        <Frame
          chapter="03 / Language and editorial composition"
          title="A localised product name"
          detail="Language requirements travel with the architectural model."
        >
          <FocusedPair clip="08-localisation" />
          <Callout name="Localised name" from={6 * fps} premountFor={fps}>
            Localised name
          </Callout>
        </Frame>
      </Sequence>
      <Sequence
        name="Landing-page composition"
        from={18 * fps}
        durationInFrames={27 * fps}
        premountFor={fps}
      >
        <Frame
          chapter="03 / Language and editorial composition"
          title="Content that merchandises the catalogue"
          detail="Landing Page, Hero and Product Grid. Editorial composition sits alongside commerce-owned price and stock."
        >
          <Footage
            clip="09-composition"
            crop={{ x: 310, y: 125, width: 1570, height: 745 }}
            style={{
              left: 80,
              top: 150,
              width: 1760,
              height: 835,
              borderRadius: 12,
            }}
          />
          <Callout
            name="Editorial composition"
            from={4 * fps}
            durationInFrames={12 * fps}
            premountFor={fps}
          >
            Reusable editorial components
          </Callout>
        </Frame>
      </Sequence>
    </>
  );
};
