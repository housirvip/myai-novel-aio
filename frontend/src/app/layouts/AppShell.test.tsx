import { fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";

import { AppShell } from "@/app/layouts/AppShell";
import * as authApi from "@/lib/auth-api";
import * as booksApi from "@/lib/books-api";
import type { BookView } from "@/lib/types";
import { renderWithRoute } from "@/test/utils";

describe("AppShell", () => {
  beforeEach(() => {
    vi.spyOn(authApi, "getSession").mockResolvedValue({
      user: { id: 1, email: "test@test.com", displayName: "Test", status: "active" },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows hint when no book is selected", async () => {
    renderWithRoute(<AppShell />, "/app", "/app");

    expect(await screen.findByText("从书库选择一本书开始创作")).toBeInTheDocument();
  });

  it("renders breadcrumb with app title", async () => {
    renderWithRoute(<AppShell />, "/app", "/app");

    const elements = await screen.findAllByText("AI 小说工作台");
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it("collapses and expands the sidebar", async () => {
    renderWithRoute(<AppShell />, "/app", "/app");

    const collapseBtn = await screen.findByRole("button", { name: "折叠导航栏" });
    expect(collapseBtn).toBeInTheDocument();

    fireEvent.click(collapseBtn);
    expect(screen.getByRole("button", { name: "展开导航栏" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "展开导航栏" }));
    expect(screen.getByRole("button", { name: "折叠导航栏" })).toBeInTheDocument();
  });

  it("shows general navigation links", async () => {
    renderWithRoute(<AppShell />, "/app", "/app");

    expect(await screen.findByRole("link", { name: "书库" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "设置" })).toBeInTheDocument();
  });

  it("has theme toggle button", async () => {
    renderWithRoute(<AppShell />, "/app", "/app");

    expect(await screen.findByRole("button", { name: "切换主题" })).toBeInTheDocument();
  });

  it("shows book nav items when on a book route", async () => {
    vi.spyOn(booksApi, "listBooks").mockResolvedValue([
      { id: 1, title: "测试书籍", status: "active" } as BookView,
    ]);

    renderWithRoute(<AppShell />, "/app/books/1", "/app/books/:bookId/*");

    expect(await screen.findByText("测试书籍")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "总览" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "资源" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "阅读" })).toBeInTheDocument();
  });

  it("hides book nav items when no bookId in route", async () => {
    renderWithRoute(<AppShell />, "/app", "/app");

    expect(await screen.findByText("从书库选择一本书开始创作")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "总览" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "资源" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "阅读" })).not.toBeInTheDocument();
  });
});
