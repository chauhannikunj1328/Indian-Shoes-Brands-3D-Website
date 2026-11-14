// Render the IndianShoes wordmark ("इंडियन" + "Shoes") as a black-on-transparent PNG, with proper
// Devanagari shaping (macOS Core Text). Kohinoor Devanagari is by Indian Type Foundry, the same
// foundry as Poppins (the site's web font), so the letterforms match.
// Run: swift store/scripts/render-wordmark.swift out.png
import AppKit

let out = CommandLine.arguments[1]
let size: CGFloat = 400
let hi = NSFont(name: "KohinoorDevanagari-Bold", size: size)!
let text = NSMutableAttributedString()
text.append(NSAttributedString(string: "इंडियन", attributes: [.font: hi, .foregroundColor: NSColor.black]))
text.append(NSAttributedString(string: "Shoes", attributes: [.font: hi, .foregroundColor: NSColor.black, .kern: -6]))

let bounds = text.boundingRect(with: NSSize(width: 10000, height: 2000), options: [.usesLineFragmentOrigin, .usesFontLeading])
let pad: CGFloat = 60
let W = Int(ceil(bounds.width + pad * 2))
let H = Int(ceil(bounds.height + pad * 2))
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: W, pixelsHigh: H, bitsPerSample: 8, samplesPerPixel: 4,
                           hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
text.draw(with: NSRect(x: pad, y: pad, width: bounds.width, height: bounds.height), options: [.usesLineFragmentOrigin, .usesFontLeading])
NSGraphicsContext.restoreGraphicsState()
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: out))
print(W, H)
