// Local-only deterministic 29-second H.264 montage encoder.
// Usage: swift -module-cache-path /tmp/nasa-swift-cache render-montage.swift FRAMES_DIR OUTPUT.mp4
import Foundation
import AVFoundation
import AppKit
import CoreGraphics
import CoreVideo

struct Segment { let file: String; let frames: Int }
let segments = [Segment(file:"01-globe.png",frames:120), Segment(file:"02-atlas.png",frames:150), Segment(file:"03-sensors.png",frames:150), Segment(file:"04-report.png",frames:210), Segment(file:"05-science.png",frames:150), Segment(file:"06-closing.png",frames:90)]
let args = CommandLine.arguments
if args.count != 3 { fatalError("Usage: render-montage.swift FRAMES_DIR OUTPUT.mp4") }
let frameDir = URL(fileURLWithPath:args[1],isDirectory:true)
let output = URL(fileURLWithPath:args[2])
if FileManager.default.fileExists(atPath:output.path) { fatalError("Output already exists; choose a new path to preserve the previous render") }
let width=1920, height=1080, fps:Int32=30
let writer = try AVAssetWriter(outputURL:output,fileType:.mp4)
let settings:[String:Any] = [AVVideoCodecKey:AVVideoCodecType.h264,AVVideoWidthKey:width,AVVideoHeightKey:height,AVVideoCompressionPropertiesKey:[AVVideoAverageBitRateKey:6_000_000,AVVideoProfileLevelKey:AVVideoProfileLevelH264HighAutoLevel,AVVideoMaxKeyFrameIntervalKey:30]]
let input=AVAssetWriterInput(mediaType:.video,outputSettings:settings)
input.expectsMediaDataInRealTime=false
let attributes:[String:Any]=[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32ARGB,kCVPixelBufferWidthKey as String:width,kCVPixelBufferHeightKey as String:height,kCVPixelBufferCGImageCompatibilityKey as String:true,kCVPixelBufferCGBitmapContextCompatibilityKey as String:true]
let adaptor=AVAssetWriterInputPixelBufferAdaptor(assetWriterInput:input,sourcePixelBufferAttributes:attributes)
guard writer.canAdd(input) else {fatalError("Cannot add H.264 video input")}
writer.add(input)
guard writer.startWriting() else {fatalError("Start failed: \(String(describing:writer.error))")}
writer.startSession(atSourceTime:.zero)
var count=0
for segment in segments {
  let url=frameDir.appendingPathComponent(segment.file)
  guard let image=NSImage(contentsOf:url),let cg=image.cgImage(forProposedRect:nil,context:nil,hints:nil) else {fatalError("Missing frame: \(url.path)")}
  guard cg.width == width && cg.height == height else {fatalError("Frame has wrong dimensions: \(segment.file)")}
  var optional:CVPixelBuffer?
  let status=CVPixelBufferCreate(kCFAllocatorDefault,width,height,kCVPixelFormatType_32ARGB,attributes as CFDictionary,&optional)
  guard status == kCVReturnSuccess,let buffer=optional else {fatalError("Cannot create buffer")}
  CVPixelBufferLockBaseAddress(buffer,[])
  let flags=CGBitmapInfo.byteOrder32Big.rawValue|CGImageAlphaInfo.noneSkipFirst.rawValue
  guard let context=CGContext(data:CVPixelBufferGetBaseAddress(buffer),width:width,height:height,bitsPerComponent:8,bytesPerRow:CVPixelBufferGetBytesPerRow(buffer),space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:flags) else {fatalError("Cannot create drawing context")}
  context.draw(cg,in:CGRect(x:0,y:0,width:width,height:height))
  CVPixelBufferUnlockBaseAddress(buffer,[])
  for _ in 0..<segment.frames {
    let deadline=Date().addingTimeInterval(30)
    while !input.isReadyForMoreMediaData {
      if writer.status == .failed {fatalError("Writer failed: \(String(describing:writer.error))")}
      if Date()>deadline {fatalError("Encoder did not become ready within 30 seconds")}
      Thread.sleep(forTimeInterval:0.002)
    }
    guard adaptor.append(buffer,withPresentationTime:CMTime(value:Int64(count),timescale:fps)) else {fatalError("Append failed: \(String(describing:writer.error))")}
    count+=1
  }
  print("Encoded \(segment.file): \(count) total frames")
}
writer.endSession(atSourceTime:CMTime(value:870,timescale:fps))
input.markAsFinished()
let semaphore=DispatchSemaphore(value:0)
writer.finishWriting{semaphore.signal()}
if semaphore.wait(timeout:.now()+60) == .timedOut {fatalError("Finish timed out")}
guard writer.status == .completed else {fatalError("Finish failed: \(String(describing:writer.error))")}
print("Completed \(count) frames, 1920x1080, 30fps, intended duration29.0s: \(output.path)")
