import React from "react";
import { useVideoConfig } from "remotion";
import { Frame, FocusedPair, Callout } from "./visuals";

export const Variants = () => {
  const { fps } = useVideoConfig();
  return (
    <Frame
      chapter="02 / Make decisions explicit"
      title="One or more sellable variants"
      detail="Required, repeatable, with a minimum of one. Their lifecycle belongs to the product."
    >
      <FocusedPair clip="06-variants" />
      <Callout
        name="Minimum variant count"
        from={14 * fps}
        durationInFrames={9 * fps}
        premountFor={fps}
      >
        At least one variant
      </Callout>
      <Callout name="Contained ownership" from={23 * fps} premountFor={fps}>
        Belongs to the product
      </Callout>
    </Frame>
  );
};
export const Categories = () => {
  const { fps } = useVideoConfig();
  return (
    <Frame
      chapter="02 / Give the connection meaning"
      title="Shared categories, independently managed"
      detail="A product can belong to multiple categories. Linked ownership keeps those categories reusable."
    >
      <FocusedPair clip="07-categories" />
      <Callout name="Reuse categories" from={12 * fps} premountFor={fps}>
        Shared categories
      </Callout>
    </Frame>
  );
};
