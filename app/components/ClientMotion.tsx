'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  cancelAnimations,
  MOTION_DURATION,
  MOTION_EASING,
  motionIsReduced,
  observeEntrance,
  observeMotionActivity,
} from '@/lib/interactionMotion';

export function ClientMotion() {
  const pathname = usePathname();
  useEffect(() => {
    let teardown = () => {};
    // The layout can hydrate before a streamed page segment. Defer DOM
    // decoration so motion attributes never race React's hydration pass.
    const startTimer = window.setTimeout(() => {
      const reduce = motionIsReduced();
      const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-reveal-group])'));
      const revealGroups = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal-group]'));
      const scrollStories = Array.from(document.querySelectorAll<HTMLElement>('[data-scroll-story]'));
      const heroNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-hero-reveal]'));

      if (reduce) {
        teardown = () => {};
        return;
      }

      const revealIndexes = new Map(nodes.map((node, index) => [node, index]));
      const revealAnimations: Animation[] = [];
      heroNodes.forEach((node, index) => {
        revealAnimations.push(node.animate(
          [
            { opacity: 0.45, transform: 'translateY(10px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          {
            duration: MOTION_DURATION.hero,
            delay: Math.min(index * MOTION_DURATION.sequenceStep, 180),
            easing: MOTION_EASING.out,
            fill: 'backwards',
          },
        ));
      });
      const reveal = (node: HTMLElement) => {
        const animation = node.animate(
          [
            { opacity: 0.72, transform: 'translateY(12px) scale(0.99)' },
            { opacity: 1, transform: 'translateY(0) scale(1)' },
          ],
          {
            duration: MOTION_DURATION.reveal,
            delay: Math.min((revealIndexes.get(node) ?? 0) * MOTION_DURATION.sequenceStep, 180),
            easing: MOTION_EASING.out,
            fill: 'backwards',
          },
        );
        revealAnimations.push(animation);
      };

      const revealGroup = (group: HTMLElement) => {
        group.dataset.revealActive = 'true';
        const items = Array.from(group.querySelectorAll<HTMLElement>('[data-reveal-item]'));
        items.forEach((item, index) => {
          const isArtifact = item.dataset.revealItem === 'artifact';
          revealAnimations.push(item.animate(
            [
              { opacity: isArtifact ? 0.68 : 0.76, transform: isArtifact ? 'translateY(14px) scale(0.985)' : 'translateY(10px)' },
              { opacity: 1, transform: 'translateY(0) scale(1)' },
            ],
            {
              duration: MOTION_DURATION.reveal,
              delay: Math.min(index * MOTION_DURATION.sequenceStep, 180),
              easing: MOTION_EASING.out,
              fill: 'backwards',
            },
          ));
        });
      };

      const activateStory = (story: HTMLElement) => {
        story.dataset.scrollActive = 'true';
        const items = Array.from(story.querySelectorAll<HTMLElement>('[data-scroll-item]'));
        items.forEach((item, index) => {
          revealAnimations.push(item.animate(
            [
              { opacity: 0.72, transform: 'translateY(10px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ],
            {
              duration: MOTION_DURATION.panel,
              delay: Math.min(index * MOTION_DURATION.sequenceStep, 180),
              easing: MOTION_EASING.out,
              fill: 'backwards',
            },
          ));
        });
      };

      const stopEntrances = observeEntrance(nodes, reveal);
      const stopRevealGroups = observeEntrance(revealGroups, revealGroup, { threshold: 0.1 });
      const stopScrollStories = observeEntrance(scrollStories, activateStory, { threshold: 0.18, immediateViewportRatio: 0.92 });
      const stopAmbientMotion = observeMotionActivity();
      teardown = () => {
        stopEntrances();
        stopRevealGroups();
        stopScrollStories();
        stopAmbientMotion();
        cancelAnimations(revealAnimations);
        revealGroups.forEach((group) => delete group.dataset.revealActive);
        scrollStories.forEach((story) => delete story.dataset.scrollActive);
      };
    }, 100);

    return () => {
      window.clearTimeout(startTimer);
      teardown();
    };
  }, [pathname]);

  return null;
}
