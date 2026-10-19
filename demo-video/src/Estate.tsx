import React from "react";
import { Series, useVideoConfig } from "remotion";
import { Frame, Footage, Callout } from "./visuals";

const WholeEstate = () => {
  const { fps } = useVideoConfig();
  return (
    <Frame
      chapter="02 / See the connected estate"
      title="A large model stays easy to explore"
      detail="Zoom and pan around the canvas, or jump to a specific content type easily."
    >
      <Footage
        clip="12-estate-focus"
        crop={{ x: 0, y: 80, width: 1920, height: 920 }}
        style={{ left: 80, top: 145, width: 1760, height: 843 }}
      />
      <Callout
        name="Estate scale"
        from={0}
        durationInFrames={2 * fps}
        premountFor={fps}
      >
        34 types · 201 fields
      </Callout>
      <Callout
        name="Select a type"
        from={3 * fps}
        durationInFrames={5 * fps}
        premountFor={fps}
      >
        Select Product → reveal its neighbourhood
      </Callout>
    </Frame>
  );
};
const Neighbourhood = () => (
  <Frame
    chapter="02 / Focus a content type"
    title="Structurally sound"
    detail="Focus on a content type and see how it relates to other types in its neighbourhood."
  >
    <Footage
      clip="12-estate-focus"
      offset={12}
      crop={{ x: 0, y: 80, width: 1920, height: 920 }}
      style={{ left: 80, top: 145, width: 1760, height: 843 }}
    />
  </Frame>
);
const VariantHover = () => (
  <Frame
    chapter="02 / Explore one reference at a time"
    title="Hover Variants → see Product Variant"
    detail="The field, its connection and its target are highlighted together."
  >
    <Footage
      clip="13-hover-variants"
      crop={{ x: 0, y: 80, width: 1920, height: 920 }}
      style={{ left: 80, top: 145, width: 1760, height: 843 }}
    />
  </Frame>
);
const CategoryHover = () => (
  <Frame
    chapter="02 / Explore one reference at a time"
    title="Hover Categories → see Category"
    detail="Studio isolates the content types related to the field you are looking at."
  >
    <Footage
      clip="14-hover-categories"
      crop={{ x: 0, y: 80, width: 1920, height: 920 }}
      style={{ left: 80, top: 145, width: 1760, height: 843 }}
    />
  </Frame>
);
const BrandHover = () => (
  <Frame
    chapter="02 / Explore one reference at a time"
    title="Hover Brand → see Brand"
    detail="Follow each reference without losing the surrounding architecture."
  >
    <Footage
      clip="15-hover-brand"
      crop={{ x: 0, y: 80, width: 1920, height: 920 }}
      style={{ left: 80, top: 145, width: 1760, height: 843 }}
    />
  </Frame>
);
const ReturnToEstate = () => (
  <Frame
    chapter="02 / Zoom back out"
    title="One click returns to the whole estate"
    detail="See the entire model from altitude. Lay out your types for efficient spacing or connection visibility."
  >
    <Footage
      clip="16-estate-reset"
      speed={1.3}
      crop={{ x: 0, y: 80, width: 1920, height: 920 }}
      style={{ left: 80, top: 145, width: 1760, height: 843 }}
    />
  </Frame>
);

export const FieldDetails = () => (
  <Frame
    chapter="02 / Get into the detail"
    title="Get into the detail"
    detail="One click opens the field details: basic options, validation settings and more."
  >
    <Footage
      clip="17-field-details"
      crop={{ x: 0, y: 80, width: 1920, height: 920 }}
      style={{ left: 80, top: 145, width: 1760, height: 843 }}
    />
  </Frame>
);

export const ExploreEstate = () => {
  const { fps } = useVideoConfig();
  return (
    <Series>
      <Series.Sequence
        name="Whole estate → select Product"
        durationInFrames={12 * fps}
        premountFor={fps}
      >
        <WholeEstate />
      </Series.Sequence>
      <Series.Sequence
        name="Readable Product neighbourhood"
        durationInFrames={10 * fps}
        premountFor={fps}
      >
        <Neighbourhood />
      </Series.Sequence>
      <Series.Sequence
        name="Hover Categories"
        durationInFrames={8 * fps}
        premountFor={fps}
      >
        <CategoryHover />
      </Series.Sequence>
      <Series.Sequence
        name="Open field details and validation settings"
        durationInFrames={12 * fps}
        premountFor={fps}
      >
        <FieldDetails />
      </Series.Sequence>
      <Series.Sequence
        name="Return to all 34 types"
        durationInFrames={6 * fps}
        premountFor={fps}
      >
        <ReturnToEstate />
      </Series.Sequence>
    </Series>
  );
};

export const HoverSample = () => {
  const { fps } = useVideoConfig();
  return (
    <Series>
      <Series.Sequence
        name="Variants reference"
        durationInFrames={8 * fps}
        premountFor={fps}
      >
        <VariantHover />
      </Series.Sequence>
      <Series.Sequence
        name="Categories reference"
        durationInFrames={8 * fps}
        premountFor={fps}
      >
        <CategoryHover />
      </Series.Sequence>
    </Series>
  );
};
