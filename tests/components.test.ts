import { type Component, mount, tick, unmount } from "svelte";
import { afterEach, describe, expect, test, vi } from "vitest";
import { Avatar, Placeholder, QrCode } from "../src";
import Icons from "./fixtures/Icons.svelte";
import ProviderFixture from "./fixtures/ProviderFixture.svelte";
import ReactiveHelper from "./fixtures/ReactiveHelper.svelte";

const mountedComponents: ReturnType<typeof mount>[] = [];
const containers: HTMLElement[] = [];

afterEach(async () => {
	for (const component of mountedComponents) {
		await unmount(component);
	}
	for (const container of containers) {
		container.remove();
	}
	mountedComponents.length = 0;
	containers.length = 0;
	vi.unstubAllGlobals();
});

describe("components", () => {
	test("renders inline icons and caches canonical SVG requests", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				new Response(
					'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path stroke="currentColor" d="M1 1h22"/></svg>',
				),
			);
		vi.stubGlobal("fetch", fetchMock);
		const container = render(Icons, {
			baseUrl: "https://icons.example.com/v1",
		});

		await vi.waitFor(() => {
			expect(container.querySelectorAll("svg path")).toHaveLength(2);
		});

		const svg = container.querySelector("svg");
		expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
		expect(svg).toHaveAttribute("aria-label", "Test icon");
		expect(svg).toHaveClass("icon");
		expect(svg?.querySelector("path")).toHaveAttribute(
			"stroke",
			"currentColor",
		);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	test("uses provider options and lets components override them", () => {
		const container = render(ProviderFixture, {
			providerBaseUrl: "https://staging.example.com/v1",
			overrideBaseUrl: "https://preview.example.com/v1",
		});

		expect(container.querySelector('[alt="Ada"]')).toHaveAttribute(
			"src",
			"https://staging.example.com/v1/avatars/initials/ada-lovelace.svg",
		);
		expect(container.querySelector('[alt="Hello"]')).toHaveAttribute(
			"src",
			"https://preview.example.com/v1/qr-codes.svg?data=aGVsbG8%3D",
		);
		expect(
			container.querySelector('[data-testid="inherited"]'),
		).toHaveTextContent(
			"https://staging.example.com/v1/avatars/initials/grace-hopper.svg",
		);
	});

	test("reacts to helper getter inputs", async () => {
		const container = render(ReactiveHelper, {});
		const assetUrl = container.querySelector('[data-testid="asset-url"]');

		expect(assetUrl).toHaveTextContent(
			"https://pictum.dev/api/v1/avatars/initials/ada-lovelace.webp",
		);

		container.querySelector("button")?.click();
		await tick();

		expect(assetUrl).toHaveTextContent(
			"https://pictum.dev/api/v1/avatars/initials/grace-hopper.webp",
		);
	});

	test("renders gendered realistic avatars", () => {
		const container = render(Avatar, {
			seed: "customer-123",
			variant: "realistic",
			gender: "female",
			alt: "Customer",
		});

		expect(container.querySelector('[alt="Customer"]')).toHaveAttribute(
			"src",
			"https://pictum.dev/api/v1/avatars/realistic/female/customer-123.webp",
		);
	});

	test("forwards QR code quiet-zone options without leaking DOM attributes", () => {
		const container = render(QrCode, {
			value: "hello",
			quietZone: false,
			alt: "Hello without quiet zone",
		});
		const image = container.querySelector('[alt="Hello without quiet zone"]');

		expect(image).toHaveAttribute(
			"src",
			"https://pictum.dev/api/v1/qr-codes.svg?data=aGVsbG8%3D&quiet_zone=0",
		);
		expect(image).not.toHaveAttribute("quietzone");
	});

	test("sets placeholder logical image dimensions", () => {
		const container = render(Placeholder, {
			width: 640,
			height: 360,
			format: "webp",
			density: 3,
			text: "Coming soon",
			alt: "Coming soon",
		});
		const image = container.querySelector('[alt="Coming soon"]');

		expect(image).toHaveAttribute("width", "640");
		expect(image).toHaveAttribute("height", "360");
		expect(image).toHaveAttribute(
			"src",
			"https://pictum.dev/api/v1/placeholders/640x360@3x.webp?text=Coming+soon",
		);
	});
});

function render<Props extends Record<string, unknown>>(
	component: Component<Props>,
	props: Props,
): HTMLElement {
	const container = document.createElement("div");
	document.body.append(container);
	mountedComponents.push(mount(component, { target: container, props }));
	containers.push(container);
	return container;
}
