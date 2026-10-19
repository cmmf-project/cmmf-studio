import React from "react";
import { Img, Sequence, staticFile, useVideoConfig } from "remotion";
import { Frame, Footage, Callout } from "./visuals";
import exportData from "./export-data.json";

export const Architecture = () => {
  const { fps } = useVideoConfig();
  return (
    <Frame
      chapter="04 / Connect the architecture"
      title="One architecture, ready to inspect"
      detail="An ecommerce architecture spanning catalogue, storefront and editorial content."
    >
      <Footage
        clip="10-architecture"
        speed={1.2}
        style={{
          left: 240,
          top: 145,
          width: 1440,
          height: 810,
          borderRadius: 12,
        }}
      />
      <Callout name="Complete model" from={6 * fps} premountFor={fps}>
        34 types · 201 fields
      </Callout>
      <div
        style={{
          position: "absolute",
          right: 90,
          top: 120,
          fontSize: 18,
          color: "#667177",
        }}
      >
        Catalogue concepts informed by commercetools documentation
      </div>
    </Frame>
  );
};

export const Export = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      <Sequence
        name="Actual ZIP export"
        durationInFrames={8 * fps}
        premountFor={fps}
      >
        <Frame
          chapter="03 / Take the model with you"
          title="The decisions leave Studio"
          detail="Export CMMF models in a ZIP archive to use in your project and add to your Git repo."
        >
          <Footage
            clip="11-export"
            crop={{ x: 290, y: 0, width: 1620, height: 768 }}
            style={{ left: 80, top: 150, width: 1760, height: 835 }}
          />
        </Frame>
      </Sequence>
      <Sequence
        name="Inspect the actual exported Product YAML"
        from={8 * fps}
        durationInFrames={17 * fps}
        premountFor={fps}
      >
        <Frame
          chapter="03 / Bring your own tools"
          title="Bring your own tools"
          detail="YAML is perfect for working with AI agents, and a solid base for conversion to other formats and specs."
        >
          <div
            style={{
              position: "absolute",
              left: 80,
              top: 180,
              width: 760,
              height: 650,
              overflow: "hidden",
              borderRadius: 12,
              border: "1px solid #D9DFDA",
              background: "#fff",
            }}
          >
            <Img
              src={staticFile("stills/06-variants.png")}
              style={{
                position: "absolute",
                width: 1728,
                left: -380,
                top: -175,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: "#fff",
                padding: "22px 28px",
                fontSize: 30,
                fontWeight: 600,
                borderTop: "1px solid #D9DFDA",
              }}
            >
              Product → Product Variant · 1..*
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              left: 900,
              top: 165,
              right: 80,
              bottom: 185,
              padding: "24px 32px",
              border: "1px solid #D9DFDA",
              borderRadius: 12,
              background: "#fff",
            }}
          >
            <div
              style={{
                fontSize: 24,
                color: "#945D9C",
                fontWeight: 600,
                marginBottom: 20,
              }}
            >
              models/product.yaml · selected exported field
            </div>
            <pre
              style={{
                fontSize: 26,
                lineHeight: 1.26,
                margin: 0,
                fontFamily: "Menlo, monospace",
                color: "#192329",
              }}
            >
              {exportData.excerpt}
            </pre>
          </div>
        </Frame>
      </Sequence>
    </>
  );
};
