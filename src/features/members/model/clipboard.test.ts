import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText } from './clipboard'

function stubClipboard(clipboard: Partial<Clipboard> | undefined) {
  vi.stubGlobal('navigator', { ...navigator, clipboard })
}

describe('copyText', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('copies a ready text with writeText', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard({ writeText })

    await expect(copyText('https://app/convite?t=1')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('https://app/convite?t=1')
  })

  it('given a text still loading, starts the clipboard write within the click, before the text arrives', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    const writeText = vi.fn()
    stubClipboard({ write, writeText })
    vi.stubGlobal(
      'ClipboardItem',
      class {
        items: Record<string, Promise<Blob>>
        constructor(items: Record<string, Promise<Blob>>) {
          this.items = items
        }
      },
    )
    let resolve: (value: string) => void = () => undefined
    const link = new Promise<string>((done) => (resolve = done))

    const copied = copyText(link)

    // Chamado de forma síncrona, ainda sem o link: é o que o Safari exige.
    expect(write).toHaveBeenCalledTimes(1)
    resolve('https://app/convite?t=2')
    await expect(copied).resolves.toBe(true)
    const item = write.mock.calls[0]![0][0] as { items: Record<string, Promise<Blob>> }
    await expect((await item.items['text/plain']!).text()).resolves.toBe('https://app/convite?t=2')
    expect(writeText).not.toHaveBeenCalled()
  })

  it('falls back to writeText when the browser rejects the pending clipboard item', async () => {
    const write = vi.fn().mockRejectedValue(new TypeError('unsupported'))
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard({ write, writeText })
    vi.stubGlobal('ClipboardItem', class {})

    await expect(copyText(Promise.resolve('https://app/convite?t=3'))).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('https://app/convite?t=3')
  })

  it.each([
    ['without the clipboard API', undefined],
    [
      'when the browser refuses the copy',
      { writeText: vi.fn().mockRejectedValue(new Error('no')) },
    ],
  ])('returns false %s, so the link can be copied manually', async (_label, clipboard) => {
    stubClipboard(clipboard)

    await expect(copyText('https://app/convite')).resolves.toBe(false)
  })
})
