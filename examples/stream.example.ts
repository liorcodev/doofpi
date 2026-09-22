import { z } from 'zod';
import Doofpi from '../index';
import { createClient } from '../index';

const d = new Doofpi();

const routes = d.routes({
  users: {
    get: d.endpointBuilder
      .model({
        input: z.object({ id: z.string() }),
        output: z.object({ id: z.string(), name: z.string() })
      })
      .read(({ input }) => ({ id: input.id, name: 'John Doe' }))
  },
  file: {
    // `download`/`upload` are reserved client-side verb names, so route keys avoid them below.
    // Download endpoints (GET) bypass JSON serialization and `model.output` validation entirely
    document: d.endpointBuilder.model({ input: z.object({ fileId: z.string() }) }).download(({ input }) => {
      const bytes = new Uint8Array([1, 2, 3, 4]);
      return new Response(bytes, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${input.fileId}.bin"`
        }
      });
    }),
    // Download also works without a model - returning raw bytes directly
    avatar: d.endpointBuilder.download(() => new Uint8Array([137, 80, 78, 71])),
    // Upload endpoints (POST) are the write-side twin of download: `input` (if any) still comes
    // from the query string, and the request body is left untouched so the handler can read it raw
    receipt: d.endpointBuilder.model({ input: z.object({ filename: z.string() }) }).upload(async ({ input, req }) => {
      const bytes = new Uint8Array(await req.arrayBuffer());
      return JSON.stringify({ filename: input.filename, size: bytes.byteLength });
    }),
    rename: d.endpointBuilder
      .model({ input: z.object({ name: z.string() }), output: z.object({ ok: z.boolean() }) })
      .write(({ input }) => ({ ok: true, name: input.name }))
  }
});

d.register(routes);

export type AppRoutes = typeof routes;

// ---- Client usage - hover `client` below to inspect the fully inferred type ----
const client = createClient<AppRoutes>({ url: 'http://localhost:3000' });

async function example() {
  // read -> input/output typed from the zod model
  const user = await client.users.get.read({ id: '1' });

  // write -> input/output typed from the zod model
  const renamed = await client.file.rename.write({ name: 'photo.png' });

  // download -> always resolves to the raw Response, never JSON-parsed
  const doc = await client.file.document.download({ fileId: 'abc123' });
  const blob = await doc.blob();

  // download without a model -> no input argument required
  const avatar = await client.file.avatar.download();
  const arrayBuffer = await avatar.arrayBuffer();

  // upload -> typed/validated input, raw body payload, and a raw (never-JSON-parsed) response back
  const uploadRes = await client.file.receipt.upload({ filename: 'photo.png' }, new Uint8Array([1, 2, 3]));
  const uploadResult = await uploadRes.text();

  return { user, renamed, blob, arrayBuffer, uploadResult };
}

void example;

void example;
