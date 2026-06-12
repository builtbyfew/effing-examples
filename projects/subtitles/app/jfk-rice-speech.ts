// Preview material for the subtitled-video effie: the opening of NASA's
// public-domain "We Chose: The Inspiration of Apollo" clip, which starts
// with JFK's 1962 Rice University speech.
// https://images.nasa.gov/details/jsc2019m000363_We_Chose_The_Inspiration_of_Apollo_mp4_1_720
//
// The word timings come from a Whisper transcription of the clip (seconds
// from the start of the video), so the karaoke highlight tracks the actual
// voice. The cues cover the first ~10 seconds, up to "of all time".

export const jfkRiceSpeech = {
  videoUrl:
    "https://images-assets.nasa.gov/video/jsc2019m000363_We_Chose_The_Inspiration_of_Apollo_mp4_1_720/jsc2019m000363_We_Chose_The_Inspiration_of_Apollo_mp4_1_720~medium.mp4",
  cues: [
    {
      text: "The exploration of space",
      start: 0.0,
      end: 1.7,
      words: [
        { text: "The", start: 0.0, end: 0.48 },
        { text: "exploration", start: 0.48, end: 0.96 },
        { text: "of", start: 0.96, end: 1.46 },
        { text: "space", start: 1.46, end: 1.72 },
      ],
    },
    {
      text: "will go ahead",
      start: 1.72,
      end: 2.85,
      words: [
        { text: "will", start: 1.72, end: 2.08 },
        { text: "go", start: 2.08, end: 2.32 },
        { text: "ahead", start: 2.32, end: 2.6 },
      ],
    },
    {
      text: "whether we join in it or not",
      start: 3.04,
      end: 5.65,
      words: [
        { text: "whether", start: 3.04, end: 3.76 },
        { text: "we", start: 3.76, end: 4.04 },
        { text: "join", start: 4.04, end: 4.34 },
        { text: "in", start: 4.34, end: 4.8 },
        { text: "it", start: 4.8, end: 4.9 },
        { text: "or", start: 4.9, end: 5.04 },
        { text: "not", start: 5.04, end: 5.4 },
      ],
    },
    {
      text: "and it is",
      start: 5.72,
      end: 7.24,
      words: [
        { text: "and", start: 5.72, end: 6.9 },
        { text: "it", start: 6.9, end: 7.1 },
        { text: "is", start: 7.1, end: 7.26 },
      ],
    },
    {
      text: "one of the great adventures",
      start: 7.26,
      end: 8.32,
      words: [
        { text: "one", start: 7.26, end: 7.56 },
        { text: "of", start: 7.56, end: 7.76 },
        { text: "the", start: 7.76, end: 7.86 },
        { text: "great", start: 7.86, end: 8.1 },
        { text: "adventures", start: 8.1, end: 8.34 },
      ],
    },
    {
      text: "of all time",
      start: 8.34,
      end: 9.69,
      words: [
        { text: "of", start: 8.34, end: 8.84 },
        { text: "all", start: 8.84, end: 9.02 },
        { text: "time", start: 9.02, end: 9.44 },
      ],
    },
  ],
};
