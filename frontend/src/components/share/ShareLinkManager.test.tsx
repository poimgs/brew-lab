import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { toast } from "sonner"
import { ShareLinkManager } from "./ShareLinkManager"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@/api/shareLink", () => ({
  getShareLink: vi.fn(),
  createShareLink: vi.fn(),
  revokeShareLink: vi.fn(),
}))

import { getShareLink, createShareLink, revokeShareLink } from "@/api/shareLink"

const mockedGetShareLink = vi.mocked(getShareLink)
const mockedCreateShareLink = vi.mocked(createShareLink)
const mockedRevokeShareLink = vi.mocked(revokeShareLink)

const noLink = {
  token: null,
  url: null,
  created_at: null,
}

const activeLink = {
  token: "abc123def456",
  url: "http://localhost:5173/share/abc123def456",
  created_at: "2026-02-20T10:00:00Z",
}

describe("ShareLinkManager", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("shows loading state then renders", async () => {
    mockedGetShareLink.mockResolvedValueOnce(noLink)

    render(<ShareLinkManager />)

    expect(screen.getByTestId("share-link-loading")).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByTestId("share-link-loading")).not.toBeInTheDocument()
    })

    expect(screen.getByText(/Share your coffee collection/)).toBeInTheDocument()
  })

  it("shows Create button when no link exists", async () => {
    mockedGetShareLink.mockResolvedValueOnce(noLink)

    render(<ShareLinkManager />)

    await waitFor(() => {
      expect(screen.getByText("Create Share Link")).toBeInTheDocument()
    })

    expect(screen.queryByLabelText("Share link URL")).not.toBeInTheDocument()
    expect(screen.queryByText("Regenerate")).not.toBeInTheDocument()
    expect(screen.queryByText("Revoke")).not.toBeInTheDocument()
  })

  it("shows link URL, copy, regenerate, and revoke when link exists", async () => {
    mockedGetShareLink.mockResolvedValueOnce(activeLink)

    render(<ShareLinkManager />)

    await waitFor(() => {
      expect(screen.getByLabelText("Share link URL")).toBeInTheDocument()
    })

    expect(screen.getByLabelText("Share link URL")).toHaveValue(
      "http://localhost:5173/share/abc123def456"
    )
    expect(screen.getByLabelText("Copy share link")).toBeInTheDocument()
    expect(screen.getByText("Regenerate")).toBeInTheDocument()
    expect(screen.getByText("Revoke")).toBeInTheDocument()
    expect(screen.getByText(/Created/)).toBeInTheDocument()
    expect(screen.queryByText("Create Share Link")).not.toBeInTheDocument()
  })

  it("creates a share link and shows it", async () => {
    mockedGetShareLink.mockResolvedValueOnce(noLink)
    mockedCreateShareLink.mockResolvedValueOnce(activeLink)

    const user = userEvent.setup()
    render(<ShareLinkManager />)

    await waitFor(() => {
      expect(screen.getByText("Create Share Link")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Create Share Link"))

    await waitFor(() => {
      expect(screen.getByLabelText("Share link URL")).toHaveValue(
        "http://localhost:5173/share/abc123def456"
      )
    })

    expect(toast.success).toHaveBeenCalledWith("Share link created")
    expect(screen.queryByText("Create Share Link")).not.toBeInTheDocument()
  })

  it("copies link URL to clipboard and shows toast", async () => {
    mockedGetShareLink.mockResolvedValueOnce(activeLink)

    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    })

    const user = userEvent.setup()
    render(<ShareLinkManager />)

    await waitFor(() => {
      expect(screen.getByLabelText("Copy share link")).toBeInTheDocument()
    })

    await user.click(screen.getByLabelText("Copy share link"))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Link copied")
    })
  })

  it("shows confirmation before regenerating", async () => {
    mockedGetShareLink.mockResolvedValueOnce(activeLink)

    const user = userEvent.setup()
    render(<ShareLinkManager />)

    await waitFor(() => {
      expect(screen.getByText("Regenerate")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Regenerate"))

    expect(
      screen.getByText("Regenerate share link? The current link will stop working.")
    ).toBeInTheDocument()
    expect(screen.getByText("Confirm")).toBeInTheDocument()
  })

  it("regenerates link after confirmation", async () => {
    mockedGetShareLink.mockResolvedValueOnce(activeLink)

    const newLink = {
      token: "newtoken789",
      url: "http://localhost:5173/share/newtoken789",
      created_at: "2026-02-21T10:00:00Z",
    }
    mockedCreateShareLink.mockResolvedValueOnce(newLink)

    const user = userEvent.setup()
    render(<ShareLinkManager />)

    await waitFor(() => {
      expect(screen.getByText("Regenerate")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Regenerate"))
    await user.click(screen.getByText("Confirm"))

    await waitFor(() => {
      expect(screen.getByLabelText("Share link URL")).toHaveValue(
        "http://localhost:5173/share/newtoken789"
      )
    })

    expect(toast.success).toHaveBeenCalledWith("Share link regenerated")
  })

  it("cancels regeneration when Cancel is clicked", async () => {
    mockedGetShareLink.mockResolvedValueOnce(activeLink)

    const user = userEvent.setup()
    render(<ShareLinkManager />)

    await waitFor(() => {
      expect(screen.getByText("Regenerate")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Regenerate"))

    expect(
      screen.getByText("Regenerate share link? The current link will stop working.")
    ).toBeInTheDocument()

    await user.click(screen.getByText("Cancel"))

    expect(
      screen.queryByText("Regenerate share link? The current link will stop working.")
    ).not.toBeInTheDocument()

    expect(mockedCreateShareLink).not.toHaveBeenCalled()
  })

  it("shows confirmation before revoking", async () => {
    mockedGetShareLink.mockResolvedValueOnce(activeLink)

    const user = userEvent.setup()
    render(<ShareLinkManager />)

    await waitFor(() => {
      expect(screen.getByText("Revoke")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Revoke"))

    expect(
      screen.getByText("Revoke share link? Anyone with the current link will lose access.")
    ).toBeInTheDocument()
  })

  it("revokes link after confirmation", async () => {
    mockedGetShareLink.mockResolvedValueOnce(activeLink)
    mockedRevokeShareLink.mockResolvedValueOnce(undefined)

    const user = userEvent.setup()
    render(<ShareLinkManager />)

    await waitFor(() => {
      expect(screen.getByText("Revoke")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Revoke"))
    await user.click(screen.getByText("Confirm"))

    await waitFor(() => {
      expect(screen.getByText("Create Share Link")).toBeInTheDocument()
    })

    expect(screen.queryByLabelText("Share link URL")).not.toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith("Share link revoked")
  })

  it("shows error toast when create fails", async () => {
    mockedGetShareLink.mockResolvedValueOnce(noLink)
    mockedCreateShareLink.mockRejectedValueOnce(new Error("Server error"))

    const user = userEvent.setup()
    render(<ShareLinkManager />)

    await waitFor(() => {
      expect(screen.getByText("Create Share Link")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Create Share Link"))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to create share link")
    })
  })

  it("shows error toast when load fails", async () => {
    mockedGetShareLink.mockRejectedValueOnce(new Error("Network error"))

    render(<ShareLinkManager />)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load share link")
    })
  })
})
