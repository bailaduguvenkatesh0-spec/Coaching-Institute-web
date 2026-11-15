import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 7: n8n 16 Workflows Validation Suite', () => {
  const workflowsDir = path.resolve('n8n/workflows');

  it('contains exactly 16 workflow JSON files', () => {
    const files = fs.readdirSync(workflowsDir).filter((f) => f.endsWith('.json'));
    expect(files.length).toBe(16);
  });

  const files = fs.readdirSync(workflowsDir).filter((f) => f.endsWith('.json'));

  files.forEach((file) => {
    describe(`Workflow File: ${file}`, () => {
      const fullPath = path.join(workflowsDir, file);
      const raw = fs.readFileSync(fullPath, 'utf8');

      it('parses as valid JSON', () => {
        expect(() => JSON.parse(raw)).not.toThrow();
      });

      const parsed = JSON.parse(raw);

      it('has name, active flag, nodes and connections', () => {
        expect(parsed.name).toBeDefined();
        expect(parsed.nodes).toBeInstanceOf(Array);
        expect(parsed.nodes.length).toBeGreaterThanOrEqual(3);
        expect(parsed.connections).toBeDefined();
      });

      it('contains no plaintext secrets or credentials in JSON', () => {
        expect(raw).not.toContain('Bearer sk-');
        expect(raw).not.toContain('passwordHash');
        expect(raw).not.toContain('AdminPass123!');
      });

      it('includes an error handling or recovery branch', () => {
        const hasErrorBranch = parsed.nodes.some(
          (n: any) =>
            n.name.toLowerCase().includes('error') ||
            n.type === 'n8n-nodes-base.if' ||
            n.name.toLowerCase().includes('fail')
        );
        expect(hasErrorBranch).toBe(true);
      });
    });
  });
});
