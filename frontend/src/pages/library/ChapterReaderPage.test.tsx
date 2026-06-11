import { fireEvent, screen, waitFor } from "@testing-library/react";
import * as ReactRouter from "react-router-dom";
import { vi } from "vitest";

import { ChapterReaderPage } from "@/pages/library/ChapterReaderPage";
import * as booksApi from "@/lib/books-api";
import * as chaptersApi from "@/lib/chapters-api";
import { renderWithRoute } from "@/test/utils";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

function mockReaderWidth(matchesDesktop: boolean) {
  let matches = matchesDesktop;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      get matches() {
        return matches;
      },
      media: query,
      onchange: null,
      addEventListener: vi.fn((eventName: string, listener: (event: MediaQueryListEvent) => void) => {
        if (eventName === "change") {
          listeners.add(listener);
        }
      }),
      removeEventListener: vi.fn((eventName: string, listener: (event: MediaQueryListEvent) => void) => {
        if (eventName === "change") {
          listeners.delete(listener);
        }
      }),
      addListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => listeners.add(listener)),
      removeListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener)),
      dispatchEvent: vi.fn(),
    })),
  });

  return {
    setMatches(nextMatches: boolean) {
      matches = nextMatches;
      listeners.forEach((listener) => {
        listener({ matches: nextMatches, media: "(min-width: 1024px)" } as MediaQueryListEvent);
      });
    },
  };
}

describe("ChapterReaderPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReaderWidth(true);
    vi.mocked(ReactRouter.useParams).mockReturnValue({ bookId: "1" });
    vi.spyOn(booksApi, "getBook").mockResolvedValue({
      id: 1,
      title: "青岳入门录",
      summary: "少年持令入宗。",
      targetChapterCount: 100,
      currentChapterCount: 2,
      status: "drafting",
      createdAt: "2026-05-10T00:00:00.000Z",
      updatedAt: "2026-05-10T00:00:00.000Z",
    } as never);

    vi.spyOn(chaptersApi, "listChapters").mockResolvedValue([
      {
        id: 1,
        bookId: 1,
        chapterNo: 1,
        title: "序章",
        summary: "开局",
        wordCount: 4,
        targetWordCount: null,
        status: "approved",
        currentPlanId: 10,
        currentDraftId: 11,
        currentReviewId: 12,
        currentFinalId: 13,
        actualCharacterIds: "11",
        actualFactionIds: null,
        actualItemIds: null,
        actualHookIds: null,
        actualWorldSettingIds: null,
        createdAt: "2026-05-10T00:00:00.000Z",
        updatedAt: "2026-05-10T00:00:00.000Z",
      },
      {
        id: 2,
        bookId: 1,
        chapterNo: 2,
        title: "黑铁令",
        summary: "入宗",
        wordCount: null,
        targetWordCount: null,
        status: "planned",
        currentPlanId: 21,
        currentDraftId: null,
        currentReviewId: null,
        currentFinalId: null,
        actualCharacterIds: null,
        actualFactionIds: null,
        actualItemIds: null,
        actualHookIds: null,
        actualWorldSettingIds: null,
        createdAt: "2026-05-10T00:00:00.000Z",
        updatedAt: "2026-05-10T00:00:00.000Z",
      },
    ] as never);

    vi.spyOn(chaptersApi, "getChapterStage").mockResolvedValue({
      metadata: {
        bookId: 1,
        chapterNo: 1,
        stage: "final",
        title: "序章",
        status: "approved",
        wordCount: 4,
        targetWordCount: null,
        updatedAt: "2026-05-10T00:00:00.000Z",
      },
      summary: "开局摘要",
      content: "成稿正文",
    } as never);
  });

  it("renders the reader shell with final content and controls", async () => {
    renderWithRoute(<ChapterReaderPage />, "/app/books/1/read", "/app/books/:bookId/read");

    await waitFor(() => {
      expect(screen.getByText("成稿正文")).toBeInTheDocument();
    });

    expect(screen.getByText("本章提要")).toBeInTheDocument();
    expect(screen.getByText("开局摘要")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "小说正文" })).toBeInTheDocument();
    expect(screen.getByRole("toolbar", { name: "阅读控制" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /减小字号/ })).toBeInTheDocument();
    const increaseFontButton = screen.getByRole("button", { name: /增大字号/ });
    expect(increaseFontButton).toBeInTheDocument();
    const widthButton = screen.getByRole("button", { name: /切换为常规阅读宽度/ });
    expect(widthButton).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(widthButton);
    expect(screen.getByRole("button", { name: /切换为加宽阅读宽度/ })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(increaseFontButton);
    expect(screen.getByText(/字号 20px/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /减小字号/ }));
    expect(screen.getByText(/字号 18px/)).toBeInTheDocument();
    expect(chaptersApi.getChapterStage).toHaveBeenCalledWith(1, 1, "final");
  });

  it("uses narrow reader width by default on phone screens", async () => {
    mockReaderWidth(false);

    renderWithRoute(<ChapterReaderPage />, "/app/books/1/read", "/app/books/:bookId/read");

    expect(await screen.findByText("成稿正文")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /切换为加宽阅读宽度/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(/字号 18px，常规版心/)).toBeInTheDocument();
  });

  it("keeps a manual reader width choice after viewport changes", async () => {
    const readerWidth = mockReaderWidth(true);

    renderWithRoute(<ChapterReaderPage />, "/app/books/1/read", "/app/books/:bookId/read");

    expect(await screen.findByText("成稿正文")).toBeInTheDocument();
    const widthButton = screen.getByRole("button", { name: /切换为常规阅读宽度/ });
    fireEvent.click(widthButton);

    expect(screen.getByRole("button", { name: /切换为加宽阅读宽度/ })).toHaveAttribute("aria-pressed", "false");

    readerWidth.setMatches(true);

    expect(screen.getByRole("button", { name: /切换为加宽阅读宽度/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("shows the final-only fallback for unfinished chapters", async () => {
    renderWithRoute(<ChapterReaderPage />, "/app/books/1/read", "/app/books/:bookId/read");

    const unfinishedChapter = await screen.findByRole("button", { name: /选择第 2 章：黑铁令，待完成/ });
    fireEvent.click(unfinishedChapter);

    expect(await screen.findByText("这一章还没有 final 成稿。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "打开该章节工作台" })).toHaveAttribute("href", "/app/books/1/chapters/2");
    expect(chaptersApi.getChapterStage).not.toHaveBeenCalledWith(1, 2, "final");
  });

  it("rejects invalid book ids without fetching reader data", () => {
    vi.mocked(ReactRouter.useParams).mockReturnValue({ bookId: "abc" });

    renderWithRoute(<ChapterReaderPage />, "/app/books/abc/read", "/app/books/:bookId/read");

    expect(screen.getByText("URL 中的书籍编号无效，请回到书籍总览重新进入。")).toBeInTheDocument();
    expect(booksApi.getBook).not.toHaveBeenCalled();
    expect(chaptersApi.listChapters).not.toHaveBeenCalled();
  });
});
