import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { interBold, interSemiBold, loadFonts } from "~/fonts";
import { ChatChrome } from "~/chat-ui";

// The chat surface the conversation annie plays over: gradient background,
// contact header, and input bar.

export const propsSchema = z.object({
  contactName: z.string(),
  accentColor: z.string().optional(),
});

export type ChatChromeProps = z.infer<typeof propsSchema>;

export const previewProps: ChatChromeProps = {
  contactName: "Sole Mate",
};

export async function runner({
  props: { contactName, accentColor = "#7c5cd6" },
  bounds: { width, height },
}: RunnerArgs<ChatChromeProps>): ImageRunnerReturn {
  const fonts = await loadFonts([interBold, interSemiBold]);
  const canvas = createCanvas(width, height);
  await renderReactElement(
    canvas.getContext("2d"),
    <ChatChrome
      contactName={contactName}
      accentColor={accentColor}
      width={width}
      height={height}
    />,
    { fonts },
  );
  return canvas.encode("png");
}
