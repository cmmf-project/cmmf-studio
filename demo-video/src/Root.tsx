import React from "react";
import { Composition, Folder, Series, useVideoConfig } from "remotion";
import { Intro } from "./Intro";
import { ExploreEstate, HoverSample, FieldDetails } from "./Estate";
import { Closing } from "./Closing";
import { Export } from "./Payoff";
import { StudioDemo as FirstPass } from "./FirstPass";
import { Variants } from "./Relationships";
import { Callout } from "./visuals";

export const StudioDemo = () => {
  const { fps } = useVideoConfig();
  return (
    <Series>
      <Series.Sequence
        name="01 / Build simply"
        durationInFrames={22 * fps}
        premountFor={fps}
      >
        <Intro />
      </Series.Sequence>
      <Series.Sequence
        name="02 / Explore the connected estate"
        durationInFrames={48 * fps}
        premountFor={fps}
      >
        <ExploreEstate />
      </Series.Sequence>
      <Series.Sequence
        name="03 / Take the model with you"
        durationInFrames={16 * fps}
        premountFor={fps}
      >
        <Export />
      </Series.Sequence>
      <Series.Sequence
        name="04 / CMMF Studio closing lockup"
        durationInFrames={6 * fps}
        premountFor={fps}
      >
        <Closing />
      </Series.Sequence>
    </Series>
  );
};

export const RemotionRoot = () => (
  <>
    <Composition
      id="StudioDemo"
      component={StudioDemo}
      durationInFrames={2760}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="EstateSample"
      component={ExploreEstate}
      durationInFrames={1440}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="HoverSample"
      component={HoverSample}
      durationInFrames={480}
      fps={30}
      width={1920}
      height={1080}
    />
    <Folder name="Chapters">
      <Composition
        id="Chapter-01-Build"
        component={Intro}
        durationInFrames={660}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Chapter-02-Explore"
        component={ExploreEstate}
        durationInFrames={1440}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Chapter-03-Export"
        component={Export}
        durationInFrames={480}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Chapter-04-Closing"
        component={Closing}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
      />
    </Folder>
    <Folder name="Archive">
      <Composition
        id="FirstPass-FourMinutes"
        component={FirstPass}
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
    </Folder>
    <Folder name="Elements">
      <Composition
        id="FieldDetailsSample"
        component={FieldDetails}
        durationInFrames={360}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="DecisionCallout"
        component={Callout}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ children: "Select Product → reveal its neighbourhood" }}
      />
    </Folder>
  </>
);
