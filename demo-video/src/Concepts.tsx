import React from "react";
import { Sequence, useVideoConfig } from "remotion";
import { Frame, Footage, Callout } from "./visuals";

export const Concepts = () => {
  const { fps } = useVideoConfig();
  return (
    <Frame
      chapter="01 / Place the concepts"
      title="Start with the things we’re talking about"
      detail="Product, Product Variant and Category. No CMS selected."
    >
      <Footage
        clip="01-concepts"
        speed={1.25}
        crop={{ x: 260, y: 95, width: 1640, height: 780 }}
        style={{
          left: 80,
          top: 150,
          width: 1760,
          height: 837,
          borderRadius: 12,
        }}
      />
      <Callout
        name="Edited-build disclosure"
        from={0}
        durationInFrames={4 * fps}
        premountFor={fps}
      >
        An edited build of the model
      </Callout>
    </Frame>
  );
};
export const Fields = () => {
  const { fps } = useVideoConfig();
  return (
    <Frame
      chapter="01 / Add the fields"
      title="Types, fields, and a board to think on"
      detail="Catalogue, store context and editorial composition grow into one architecture."
    >
      <Sequence
        name="Add readable fields"
        durationInFrames={19 * fps}
        premountFor={fps}
      >
        <Footage
          clip="02-fields"
          speed={1.3}
          crop={{ x: 260, y: 95, width: 1640, height: 780 }}
          style={{ left: 80, top: 150, width: 1760, height: 837 }}
        />
      </Sequence>
      <Sequence
        name="Catalogue milestone"
        from={19 * fps}
        durationInFrames={7 * fps}
        premountFor={fps}
      >
        <Footage
          clip="03-catalogue"
          speed={1.4}
          style={{ left: 260, top: 145, width: 1440, height: 810 }}
        />
        <Callout name="Catalogue group" from={0} premountFor={fps}>
          Prepared milestone · catalogue
        </Callout>
      </Sequence>
      <Sequence
        name="Store-context milestone"
        from={26 * fps}
        durationInFrames={7 * fps}
        premountFor={fps}
      >
        <Footage
          clip="04-store-context"
          speed={1.4}
          style={{ left: 260, top: 145, width: 1440, height: 810 }}
        />
        <Callout name="Store context" from={0} premountFor={fps}>
          Prepared milestone · store context
        </Callout>
      </Sequence>
      <Sequence
        name="All types and fields"
        from={33 * fps}
        durationInFrames={7 * fps}
        premountFor={fps}
      >
        <Footage
          clip="05-editorial"
          speed={1.4}
          style={{ left: 260, top: 145, width: 1440, height: 810 }}
        />
        <Callout name="Scale of the model" from={0} premountFor={fps}>
          34 types · 201 fields
        </Callout>
      </Sequence>
    </Frame>
  );
};
