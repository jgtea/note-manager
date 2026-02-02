export interface ParsedEmail {
  from: string
  subject: string
  content: string
  receivedAt: string
}

export async function parseEmailFile(file: File): Promise<ParsedEmail> {
  const text = await file.text()

  if (file.name.endsWith('.eml')) {
    return parseEmlFile(text)
  } else if (file.name.endsWith('.msg')) {
    return parseMsgFile(text)
  }

  throw new Error('Ongeldig bestandstype. Gebruik .eml of .msg bestanden.')
}

function parseEmlFile(content: string): ParsedEmail {
  const lines = content.split(/\r?\n/)
  let from = ''
  let subject = ''
  let date = ''
  let bodyStartIndex = 0

  // Parse headers
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line === '') {
      bodyStartIndex = i + 1
      break
    }

    const fromMatch = line.match(/^From:\s*(.+)$/i)
    if (fromMatch) {
      from = decodeHeader(fromMatch[1].trim())
    }

    const subjectMatch = line.match(/^Subject:\s*(.+)$/i)
    if (subjectMatch) {
      subject = decodeHeader(subjectMatch[1].trim())
    }

    const dateMatch = line.match(/^Date:\s*(.+)$/i)
    if (dateMatch) {
      date = dateMatch[1].trim()
    }
  }

  // Extract body (simplified - handles plain text)
  let body = lines.slice(bodyStartIndex).join('\n')

  // Try to extract plain text from multipart messages
  const plainTextMatch = body.match(/Content-Type:\s*text\/plain[\s\S]*?\n\n([\s\S]*?)(?=--|\n\n--)/i)
  if (plainTextMatch) {
    body = plainTextMatch[1]
  }

  // Clean up quoted-printable encoding
  body = decodeQuotedPrintable(body)

  // Clean up the body
  body = body
    .replace(/=\r?\n/g, '') // Remove soft line breaks
    .replace(/^--.*$/gm, '') // Remove boundaries
    .replace(/Content-Type:.*$/gim, '')
    .replace(/Content-Transfer-Encoding:.*$/gim, '')
    .trim()

  return {
    from: from || 'Onbekend',
    subject: subject || 'Geen onderwerp',
    content: body.substring(0, 5000), // Limit content length
    receivedAt: date ? new Date(date).toISOString() : new Date().toISOString(),
  }
}

function parseMsgFile(content: string): ParsedEmail {
  // MSG files are binary (OLE format), so text reading won't work properly
  // For now, extract what we can from the raw content
  // A proper implementation would need a library like @pnp/msg-reader

  // Try to find some text content
  const cleanContent = content.replace(/[\x00-\x1F\x7F-\xFF]/g, ' ').replace(/\s+/g, ' ').trim()

  return {
    from: 'Uit MSG bestand',
    subject: 'MSG Email Bijlage',
    content: cleanContent.substring(0, 2000) || 'Inhoud kon niet worden uitgelezen. MSG bestanden hebben beperkte ondersteuning.',
    receivedAt: new Date().toISOString(),
  }
}

function decodeHeader(header: string): string {
  // Decode MIME encoded-word syntax (=?charset?encoding?text?=)
  return header.replace(/=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi, (_, _charset, encoding, text) => {
    try {
      if (encoding.toUpperCase() === 'B') {
        return atob(text)
      } else if (encoding.toUpperCase() === 'Q') {
        return decodeQuotedPrintable(text.replace(/_/g, ' '))
      }
    } catch {
      return text
    }
    return text
  })
}

function decodeQuotedPrintable(text: string): string {
  return text.replace(/=([0-9A-F]{2})/gi, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16))
  })
}
