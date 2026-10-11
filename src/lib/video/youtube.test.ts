import { describe, it, expect } from "vitest";
import { youtubeId, youtubeMiniatura } from "./youtube";

describe("youtubeId", () => {
  it("extrae el id de los formatos habituales de link", () => {
    expect(youtubeId("https://www.youtube.com/watch?v=Ku5kU3eJ2Ik")).toBe("Ku5kU3eJ2Ik");
    expect(youtubeId("https://youtube.com/watch?feature=share&v=Ku5kU3eJ2Ik&t=10")).toBe("Ku5kU3eJ2Ik");
    expect(youtubeId("https://m.youtube.com/watch?v=Ku5kU3eJ2Ik")).toBe("Ku5kU3eJ2Ik");
    expect(youtubeId("https://youtu.be/Ku5kU3eJ2Ik?si=abc")).toBe("Ku5kU3eJ2Ik");
    expect(youtubeId("https://www.youtube.com/shorts/Ku5kU3eJ2Ik")).toBe("Ku5kU3eJ2Ik");
    expect(youtubeId("https://www.youtube.com/embed/Ku5kU3eJ2Ik")).toBe("Ku5kU3eJ2Ik");
  });

  it("devuelve null si no es un link de video de YouTube", () => {
    expect(youtubeId("https://vimeo.com/123456")).toBeNull();
    expect(youtubeId("https://www.youtube.com/@canal")).toBeNull();
    expect(youtubeId("no es un link")).toBeNull();
    expect(youtubeId("")).toBeNull();
  });
});

describe("youtubeMiniatura", () => {
  it("arma la URL de la miniatura", () => {
    expect(youtubeMiniatura("Ku5kU3eJ2Ik")).toBe("https://i.ytimg.com/vi/Ku5kU3eJ2Ik/hqdefault.jpg");
  });
});
