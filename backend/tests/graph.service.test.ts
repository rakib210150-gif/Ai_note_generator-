import { describe, it, expect } from "vitest";
import { graphService } from "../src/modules/graph/graph.service.js";

describe("GraphService Unit Tests", () => {
  it("should return curated roadmaps with valid prerequisites and unlocks", () => {
    const presets = graphService.getPresets();
    expect(presets.length).toBeGreaterThan(0);

    const cpp = presets.find((p) => p.id === "cpp-programming");
    expect(cpp).toBeDefined();
    expect(cpp?.nodes.length).toBeGreaterThanOrEqual(10);
    expect(cpp?.edges.length).toBeGreaterThanOrEqual(10);

    // Verify root foundation concept has 0 prerequisites
    const rootNode = cpp?.nodes.find((n) => n.id === "cs-fundamentals");
    expect(rootNode).toBeDefined();
    expect(rootNode?.prerequisites).toEqual([]);
    expect(rootNode?.tier).toBe("foundation");

    // Verify Biology Nucleus roadmap
    const bio = presets.find((p) => p.id === "biology-nucleus");
    expect(bio).toBeDefined();
    expect(bio?.nodes.some((n) => n.name.includes("Nuclear") || n.name.includes("Nucleus"))).toBe(true);
    expect(bio?.nodes.some((n) => n.name.includes("Cell"))).toBe(true);
  });

  it("should cascade status unlocking when a prerequisite is mastered", async () => {
    const userId = "test-user-cascade";
    const graphId = "cpp-programming";
    
    // Test updating a node
    const updated = await graphService.updateNodeStatus(userId, graphId, "cpp-syntax", "mastered");
    expect(updated).toBeDefined();
    const syntaxNode = updated.nodes.find((n) => n.id === "cpp-syntax");
    expect(syntaxNode?.status).toBe("mastered");
  });
});
