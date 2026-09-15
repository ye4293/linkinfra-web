import type { ApiDoc, DocField, DocLanguage } from './catalog';

export const codeLanguages = ['cURL', 'Python', 'JavaScript', 'Go'] as const;
export type CodeLanguage = (typeof codeLanguages)[number];

const shellQuote = (value: string) => `'${value.replace(/'/g, `'"'"'`)}'`;

export function examplePath(doc: ApiDoc) {
  const model =
    doc.slug === 'api/gemini-audio'
      ? 'gemini-2.5-flash-preview-tts'
      : 'gemini-2.5-flash';
  return doc.path.replace('{model}', model);
}

export function requestExample(
  doc: ApiDoc,
  root: string,
  language: CodeLanguage
): string {
  const url = `${root}${examplePath(doc)}`;
  const body = JSON.stringify(doc.body, null, 2);
  const extraHeaders = doc.headers || {};
  const fields = Object.entries(doc.body || {}).filter(
    ([key]) => key !== 'file'
  );
  if (language === 'cURL') {
    const lines = [
      `curl --request ${doc.method} ${shellQuote(url)}`,
      '  --header "Authorization: Bearer $LINKINFRA_API_KEY"'
    ];
    for (const [key, value] of Object.entries(extraHeaders))
      lines.push(`  --header ${shellQuote(`${key}: ${value}`)}`);
    if (doc.multipart) {
      fields.forEach(([key, value]) =>
        lines.push(`  --form ${shellQuote(`${key}=${value}`)}`)
      );
      lines.push(`  --form ${shellQuote(`file=@${doc.body?.file}`)}`);
    } else if (doc.body) {
      lines.push(
        '  --header "Content-Type: application/json"',
        `  --data ${shellQuote(body)}`
      );
    }
    if (doc.binary) lines.push('  --output speech.mp3');
    return lines.join(' \\\n');
  }
  if (language === 'Python') {
    const headers = { Authorization: '__KEY__', ...extraHeaders };
    const headerCode = JSON.stringify(headers, null, 4).replace(
      '"__KEY__"',
      'f"Bearer {os.environ[\'LINKINFRA_API_KEY\']}"'
    );
    const imports = `import os\n${
      doc.body && !doc.multipart ? 'import json\n' : ''
    }import requests\n`;
    const payload =
      doc.body && !doc.multipart
        ? `\npayload = json.loads('''\n${body
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")}\n''')\n`
        : '';
    const call = `requests.${doc.method.toLowerCase()}(\n    ${JSON.stringify(
      url
    )},\n    headers=headers,${
      doc.body
        ? doc.multipart
          ? `\n    data=${JSON.stringify(
              Object.fromEntries(fields)
            )},\n    files={"file": audio},`
          : '\n    json=payload,'
        : ''
    }\n    timeout=120,\n)`;
    const request = doc.multipart
      ? `with open(${JSON.stringify(
          doc.body?.file
        )}, "rb") as audio:\n    response = ${call.replace(/\n/g, '\n    ')}`
      : `response = ${call}`;
    const output = doc.binary
      ? 'with open("speech.mp3", "wb") as audio:\n    audio.write(response.content)'
      : 'print(response.json())';
    return `${imports}\nheaders = ${headerCode}\n${payload}\n${request}\nresponse.raise_for_status()\n${output}`;
  }
  if (language === 'JavaScript') {
    const imports = `${
      doc.multipart ? 'import { openAsBlob } from "node:fs";\n' : ''
    }${doc.binary ? 'import { writeFile } from "node:fs/promises";\n' : ''}`;
    const form = doc.multipart
      ? `const form = new FormData();\n${fields
          .map(
            ([key, value]) =>
              `form.set(${JSON.stringify(key)}, ${JSON.stringify(
                String(value)
              )});`
          )
          .join('\n')}\nform.set("file", await openAsBlob(${JSON.stringify(
          doc.body?.file
        )}), ${JSON.stringify(doc.body?.file)});\n\n`
      : '';
    const headers = JSON.stringify(
      {
        Authorization: '__KEY__',
        ...extraHeaders,
        ...(!doc.multipart && doc.body
          ? { 'Content-Type': 'application/json' }
          : {})
      },
      null,
      4
    ).replace('"__KEY__"', '`Bearer ${process.env.LINKINFRA_API_KEY}`');
    const payload = doc.body
      ? `,\n  body: ${
          doc.multipart
            ? 'form'
            : `JSON.stringify(${body.replace(/\n/g, '\n  ')})`
        }`
      : '';
    return `${imports}${
      imports ? '\n' : ''
    }${form}const response = await fetch(${JSON.stringify(
      url
    )}, {\n  method: "${doc.method}",\n  headers: ${headers.replace(
      /\n/g,
      '\n  '
    )}${payload},\n  signal: AbortSignal.timeout(120_000),\n});\n\nif (!response.ok) {\n  throw new Error(await response.text());\n}\n\n${
      doc.binary
        ? 'await writeFile("speech.mp3", Buffer.from(await response.arrayBuffer()));'
        : 'console.log(await response.json());'
    }`;
  }
  const imports = [
    '"fmt"',
    '"io"',
    '"net/http"',
    '"os"',
    '"time"',
    ...(doc.multipart
      ? ['"bytes"', '"mime/multipart"']
      : doc.body
      ? ['"strings"']
      : [])
  ];
  const setup = doc.multipart
    ? `var body bytes.Buffer\nwriter := multipart.NewWriter(&body)\n${fields
        .map(
          ([key, value]) =>
            `if err := writer.WriteField(${JSON.stringify(
              key
            )}, ${JSON.stringify(
              String(value)
            )}); err != nil {\n    panic(err)\n}`
        )
        .join('\n')}\nfile, err := os.Open(${JSON.stringify(
        doc.body?.file
      )})\nif err != nil { panic(err) }\ndefer file.Close()\npart, err := writer.CreateFormFile("file", ${JSON.stringify(
        doc.body?.file
      )})\nif err != nil { panic(err) }\nif _, err = io.Copy(part, file); err != nil { panic(err) }\nif err = writer.Close(); err != nil { panic(err) }\n`
    : doc.body
    ? `body := strings.NewReader(${
        body.includes('`') ? JSON.stringify(body) : '`' + body + '`'
      })\n`
    : '';
  const headers = Object.entries(extraHeaders)
    .map(
      ([key, value]) =>
        `req.Header.Set(${JSON.stringify(key)}, ${JSON.stringify(value)})\n`
    )
    .join('');
  const contentType = doc.multipart
    ? 'req.Header.Set("Content-Type", writer.FormDataContentType())\n'
    : doc.body
    ? 'req.Header.Set("Content-Type", "application/json")\n'
    : '';
  const output = doc.binary
    ? 'if err = os.WriteFile("speech.mp3", data, 0600); err != nil { panic(err) }'
    : 'fmt.Println(string(data))';
  const main = `${setup}req, err := http.NewRequest("${
    doc.method
  }", ${JSON.stringify(url)}, ${
    doc.multipart ? '&body' : doc.body ? 'body' : 'nil'
  })\nif err != nil { panic(err) }\nreq.Header.Set("Authorization", "Bearer " + os.Getenv("LINKINFRA_API_KEY"))\n${headers}${contentType}client := &http.Client{Timeout: 120 * time.Second}\nres, err := client.Do(req)\nif err != nil { panic(err) }\ndefer res.Body.Close()\ndata, err := io.ReadAll(res.Body)\nif err != nil { panic(err) }\nif res.StatusCode >= 400 {\n    panic(fmt.Sprintf("HTTP %d: %s", res.StatusCode, data))\n}\n${output}`;
  return `package main\n\nimport (\n${imports
    .sort()
    .map((item) => `    ${item}`)
    .join('\n')}\n)\n\nfunc main() {\n    ${main.replace(/\n/g, '\n    ')}\n}`;
}

export function docMarkdown(
  doc: ApiDoc,
  root: string,
  lang: DocLanguage
): string {
  const required = lang === 'zh' ? '必填' : 'required';
  const describeFields = (items: DocField[], prefix = ''): string =>
    items
      .map((item) => {
        const name = `${prefix}${item.name}`;
        return `- **${name}** (${item.type}${
          item.required ? `, ${required}` : ''
        }): ${item.description[lang]}${
          item.children ? '\n' + describeFields(item.children, `${name}.`) : ''
        }`;
      })
      .join('\n');
  const fields = describeFields(doc.fields);
  return `# ${doc.title[lang]}\n\n${doc.description[lang]}\n\n\`${
    doc.method
  } ${root}${doc.path}\`\n\n## ${
    lang === 'zh' ? '身份验证' : 'Authentication'
  }\n\n\`Authorization: Bearer $LINKINFRA_API_KEY\`\n${
    doc.headers
      ? `\n${Object.entries(doc.headers)
          .map(([key, value]) => `\`${key}: ${value}\``)
          .join('\n')}\n`
      : ''
  }${
    doc.pathFields
      ? `\n## ${
          lang === 'zh' ? '路径参数' : 'Path parameters'
        }\n\n${describeFields(doc.pathFields)}\n`
      : ''
  }\n## ${lang === 'zh' ? '请求参数' : 'Request parameters'}\n\n${
    fields || (lang === 'zh' ? '无需请求体。' : 'No request body.')
  }\n\n${doc.note ? `${doc.note[lang]}\n\n` : ''}## ${
    lang === 'zh' ? '请求示例' : 'Request example'
  }\n\n\`\`\`bash\n${requestExample(doc, root, 'cURL')}\n\`\`\`\n\n## ${
    lang === 'zh' ? '响应示例' : 'Response example'
  }\n\n\`\`\`${doc.binary ? 'text' : 'json'}\n${
    doc.binary ? doc.response : JSON.stringify(doc.response, null, 2)
  }\n\`\`\`\n\n${describeFields(doc.responseFields)}\n${
    doc.streaming
      ? `\n## ${lang === 'zh' ? '流式响应' : 'Streaming'}\n\n${
          doc.streaming[lang]
        }\n`
      : ''
  }`;
}
