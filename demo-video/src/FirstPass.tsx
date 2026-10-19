import React from "react";
import { Composition, Folder, Series, useVideoConfig } from "remotion";
import { Concepts, Fields } from "./Concepts";
import { Variants, Categories } from "./Relationships";
import { EditorialComposition } from "./Composition";
import { Architecture, Export } from "./Payoff";
import { Callout } from "./visuals";

const ChapterOne = () => {
  const { fps } = useVideoConfig();
  return (
    <Series>
      <Series.Sequence
        name="Place the concepts"
        durationInFrames={20 * fps}
        premountFor={fps}
      >
        <Concepts />
      </Series.Sequence>
      <Series.Sequence
        name="Add the fields"
        durationInFrames={40 * fps}
        premountFor={fps}
      >
        <Fields />
      </Series.Sequence>
    </Series>
  );
};
const ChapterTwo = () => {
  const { fps } = useVideoConfig();
  return (
    <Series>
      <Series.Sequence
        name="Contained variants"
        durationInFrames={40 * fps}
        premountFor={fps}
      >
        <Variants />
      </Series.Sequence>
      <Series.Sequence
        name="Shared categories"
        durationInFrames={35 * fps}
        premountFor={fps}
      >
        <Categories />
      </Series.Sequence>
    </Series>
  );
};
const ChapterFour = () => {
  const { fps } = useVideoConfig();
  return (
    <Series>
      <Series.Sequence
        name="Complete architecture"
        durationInFrames={35 * fps}
        premountFor={fps}
      >
        <Architecture />
      </Series.Sequence>
      <Series.Sequence
        name="Actual portable export"
        durationInFrames={25 * fps}
        premountFor={fps}
      >
        <Export />
      </Series.Sequence>
    </Series>
  );
};
export const StudioDemo = () => {
  const { fps } = useVideoConfig();
  return (
    <Series>
      <Series.Sequence
        name="01 / Concepts and fields"
        durationInFrames={60 * fps}
        premountFor={fps}
      >
        <ChapterOne />
      </Series.Sequence>
      <Series.Sequence
        name="02 / Relationship decisions"
        durationInFrames={75 * fps}
        premountFor={fps}
      >
        <ChapterTwo />
      </Series.Sequence>
      <Series.Sequence
        name="03 / Language and composition"
        durationInFrames={45 * fps}
        premountFor={fps}
      >
        <EditorialComposition />
      </Series.Sequence>
      <Series.Sequence
        name="04 / Architecture and export"
        durationInFrames={60 * fps}
        premountFor={fps}
      >
        <ChapterFour />
      </Series.Sequence>
    </Series>
  );
};

export const RemotionRoot = () => (
  <>
    <Composition
      id="StudioDemo"
      component={StudioDemo}
      durationInFrames={7200}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="RelationshipSample"
      component={Variants}
      durationInFrames={1200}
      fps={30}
      width={1920}
      height={1080}
    />
    <Folder name="Chapters">
      <Composition
        id="Chapter-01-Concepts"
        component={ChapterOne}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Chapter-02-Relationships"
        component={ChapterTwo}
        durationInFrames={2250}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Chapter-03-Composition"
        component={EditorialComposition}
        durationInFrames={1350}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Chapter-04-Export"
        component={ChapterFour}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
      />
    </Folder>
    <Folder name="Scenes">
      <Composition
        id="Concepts"
        component={Concepts}
        durationInFrames={600}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Fields"
        component={Fields}
        durationInFrames={1200}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Variants"
        component={Variants}
        durationInFrames={1200}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Categories"
        component={Categories}
        durationInFrames={1050}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="EditorialComposition"
        component={EditorialComposition}
        durationInFrames={1350}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Architecture"
        component={Architecture}
        durationInFrames={1050}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Export"
        component={Export}
        durationInFrames={750}
        fps={30}
        width={1920}
        height={1080}
      />
    </Folder>
    <Folder name="Elements">
      <Composition
        id="DecisionCallout"
        component={Callout}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ children: "At least one variant" }}
      />
    </Folder>
  </>
);
