import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import brand from "./brand-motion.json";

// Canonical motion kit: unchanged outlined artwork, timing, easing and gradient.
// Seek from the Remotion frame so playback and arbitrary frame renders agree.
export const Closing = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const container = useRef<HTMLDivElement>(null);
  const anchors = useRef<Map<Element, { x: number; y: number }>>(new Map());
  useLayoutEffect(() => {
    const svg = container.current!.querySelector("svg")!;
    const part = (name: string) => svg.querySelector<SVGGElement>(`[data-motion-part="${name}"]`)!;
    const wordmark = part("wordmark");
    const name = part("name");
    for (const el of [wordmark, name]) {
      if (!anchors.current.has(el)) {
        const b = el.getBBox();
        anchors.current.set(el, { x: b.x + b.width / 2, y: b.y + b.height });
      }
    }
    const { headline: timing, easing } = brand.tokens;
    const total = timing.name.delay + timing.name.fadeDuration + timing.gradient.tail;
    const time = Math.min(total, Math.max(0, (frame / fps) * 1000));
    const phase = (delay: number, duration: number, curve: number[]) =>
      Easing.bezier(curve[0], curve[1], curve[2], curve[3])(
        Math.max(0, Math.min(1, (time - delay) / duration)),
      );
    const moving = svg.querySelector<SVGGElement>("[data-motion-moving]")!;
    const mask = svg.querySelector<SVGRectElement>("[data-motion-mask]")!;
    const symbol = part("symbol");
    const rise = phase(timing.symbol.delay, timing.symbol.duration, easing.rise);
    if (rise === 1) {
      moving.removeAttribute("transform");
      symbol.removeAttribute("clip-path");
    } else {
      symbol.setAttribute("clip-path", `url(#${mask.parentElement!.id})`);
      moving.setAttribute("transform", `translate(0 ${(Number(mask.getAttribute("height")) + 1) * (1 - rise)})`);
    }
    const gradient = svg.querySelector("[data-motion-gradient]")!;
    const settle = 1 - phase(0, total, easing.gradient);
    if (settle === 0) gradient.removeAttribute("gradientTransform");
    else gradient.setAttribute("gradientTransform", `translate(${-timing.gradient.displacement * settle} ${timing.gradient.displacement * settle})`);
    for (const [el, settings] of [[wordmark, timing.wordmark], [name, timing.name]] as const) {
      const p = phase(settings.delay, settings.duration, easing.lettering);
      const opacity = phase(settings.delay, settings.fadeDuration, easing.opacity);
      if (opacity === 1) el.removeAttribute("opacity");
      else el.setAttribute("opacity", String(opacity));
      if (p === 1) el.removeAttribute("transform");
      else {
        const a = anchors.current.get(el)!;
        const scale = settings.scale + (1 - settings.scale) * p;
        el.setAttribute("transform", `translate(0 ${settings.rise * (1 - p)}) translate(${a.x} ${a.y}) scale(${scale}) translate(${-a.x} ${-a.y})`);
      }
    }
    svg.dataset.motionState = time === total ? "complete" : "entering";
  }, [frame, fps]);
  return (
    <AbsoluteFill style={{ background: "#F6F7F3", justifyContent: "center", alignItems: "center" }}>
      <div
        ref={container}
        style={{ width: 1100, height: (1100 * 256) / 814 }}
        dangerouslySetInnerHTML={{ __html: brand.svg.replace('width="814" height="256"', 'width="1100" height="346"') }}
      />
    </AbsoluteFill>
  );
};
