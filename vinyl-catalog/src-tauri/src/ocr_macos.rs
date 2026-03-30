/*!
 * macOS Vision.framework OCR — zero-byte overhead (uses built-in OS API).
 *
 * Calls VNRecognizeTextRequest via objc2-vision.
 * Only compiled on macOS.
 */

#[cfg(target_os = "macos")]
pub fn recognize_text(image_data: &[u8]) -> Result<String, String> {
    use objc2_foundation::{NSArray, NSData};
    use objc2_vision::{
        VNImageRequestHandler, VNRecognizeTextRequest, VNRequestTextRecognitionLevel, VNRequest,
    };
    use objc2_core_image::CIImage;
    use objc2::AnyThread;
    use objc2::rc::Retained;

    // Safety: all Vision calls happen synchronously on this thread.
    unsafe {
        // Build NSData from the raw bytes
        let data = NSData::with_bytes(image_data);

        // Create a CIImage from the JPEG/PNG bytes
        let ci_image = CIImage::initWithData(
            CIImage::alloc(),
            &data,
        )
        .ok_or("failed to decode image")?;

        // Build the recognition request
        let request = VNRecognizeTextRequest::new();
        request.setRecognitionLevel(VNRequestTextRecognitionLevel::Accurate);
        request.setUsesLanguageCorrection(true);

        // Execute the request against the image
        let handler = VNImageRequestHandler::initWithCIImage_options(
            VNImageRequestHandler::alloc(),
            &ci_image,
            &objc2_foundation::NSDictionary::new(),
        );

        // Clone before upcast so we can read results afterwards
        let request_for_results = request.clone();
        let request_vn: Retained<VNRequest> = Retained::cast_unchecked(request);
        let requests = NSArray::from_id_slice(&[request_vn]);

        handler
            .performRequests_error(&requests)
            .map_err(|e| format!("VNImageRequestHandler error: {:?}", e))?;

        // Collect results
        let observations = request_for_results.results().ok_or("no results")?;
        let mut texts: Vec<String> = Vec::new();
        for i in 0..observations.len() {
            let obs = observations.objectAtIndex(i);
            if let Some(candidate) = obs.topCandidates(1).firstObject() {
                texts.push(candidate.string().to_string());
            }
        }

        Ok(texts.join(" "))
    }
}
