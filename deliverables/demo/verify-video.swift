// Usage: swift -module-cache-path /tmp/nasa-swift-cache verify-video.swift OUTPUT.mp4 QA_DIR
import Foundation
import AVFoundation
import AppKit
let args=CommandLine.arguments
if args.count != 3 {fatalError("Usage: verify-video.swift VIDEO QA_DIR")}
let url=URL(fileURLWithPath:args[1]), out=URL(fileURLWithPath:args[2],isDirectory:true)
try FileManager.default.createDirectory(at:out,withIntermediateDirectories:true)
let asset=AVURLAsset(url:url)
let duration=CMTimeGetSeconds(asset.duration)
let video=asset.tracks(withMediaType:.video)
let audio=asset.tracks(withMediaType:.audio)
guard video.count == 1 else{fatalError("Expected one video track")}
let track=video[0]
print("durationSeconds=\(duration), dimensions=\(track.naturalSize), nominalFrameRate=\(track.nominalFrameRate), audioTracks=\(audio.count)")
guard abs(duration-29.0)<0.04 else{fatalError("Unexpected duration")}
guard track.naturalSize.width == 1920 && track.naturalSize.height == 1080 else{fatalError("Unexpected dimensions")}
guard abs(track.nominalFrameRate-30)<0.1 else{fatalError("Unexpected frame rate")}
guard audio.isEmpty else{fatalError("Unexpected audio")}
let generator=AVAssetImageGenerator(asset:asset)
generator.appliesPreferredTrackTransform=true
generator.requestedTimeToleranceBefore = .zero
generator.requestedTimeToleranceAfter = .zero
for (index,second) in [1.0,6.0,11.0,17.0,23.0,27.5].enumerated(){
 let image=try generator.copyCGImage(at:CMTime(seconds:second,preferredTimescale:30),actualTime:nil)
 let rep=NSBitmapImageRep(cgImage:image)
 guard let data=rep.representation(using:.png,properties:[:]) else{fatalError("PNG export failed")}
 try data.write(to:out.appendingPathComponent("decoded-\(index+1).png"))
}
print("Decoded six scene-center frames for visual inspection")
