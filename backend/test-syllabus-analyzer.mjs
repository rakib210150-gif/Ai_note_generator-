import dotenv from "dotenv";
dotenv.config({ path: "backend/.env" });
import { createClient } from "@supabase/supabase-js";

(async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Get a user
  const { data: users } = await supabase.from("profiles").select("id").limit(1);
  const userId = users && users[0] ? users[0].id : "test-user";

  const payload = {
    referenceBookName: "Computer_Graphics_Hearn_Baker.pdf",
    syllabusName: "CSE321_Computer_Graphics_Course_Outline.pdf",
    referenceBookText: `Chapter 1: Introduction to Computer Graphics and Applications. Display devices, raster scan systems, random scan systems, video controller.
Chapter 2: Output Primitives. Points and lines, line drawing algorithms DDA, Bresenham line algorithm, circle generating algorithms midpoint circle algorithm, ellipse algorithms.
Chapter 3: Two-Dimensional Geometric Transformations. Basic transformations translation, rotation, scaling. Matrix representations and homogeneous coordinates, composite transformations.
Chapter 4: Two-Dimensional Viewing. The viewing pipeline, viewing coordinate reference frame, window-to-viewport coordinate transformation, clipping operations: Cohen-Sutherland line clipping, Sutherland-Hodgeman polygon clipping.
Chapter 5: Three-Dimensional Concepts. 3D display methods, parallel projection, perspective projection.
Chapter 6: Visible-Surface Detection Methods. Classification of visible surface detection algorithms, Back-Face detection, Depth-Buffer (Z-Buffer) method, A-Buffer method.
Chapter 7: Illumination Models and Surface Rendering. Light sources, basic illumination models: ambient light, diffuse reflection, specular reflection, Phong model, Gouraud shading, Phong shading.
Chapter 8: Advanced VR and Haptic Hardware Devices. Custom sensory hardware, gloves, immersion rigs.`,
    syllabusText: `Course Title: Computer Graphics
Course Code: CSE 321
Level: Undergraduate BSc in CSE
Course Outline & Syllabus:
1. Introduction to Computer Graphics, Video display devices, Raster scan and Random scan systems.
2. Line generation algorithms: DDA line algorithm, Bresenham algorithm. Midpoint circle algorithm.
3. 2D Transformations: Translation, rotation, scaling, homogeneous coordinates, matrix representation, composite transformations.
4. 2D Viewing and Clipping: Viewing pipeline, window-to-viewport transformation, Cohen-Sutherland line clipping algorithm, Sutherland-Hodgman polygon clipping.
5. 3D Transformations and Projections: Parallel and perspective projections.
6. Visible surface detection: Back-face detection, Depth buffer (Z-buffer) algorithm.
7. Illumination and Shading: Ambient, diffuse, specular reflection, Phong illumination model, Gouraud and Phong shading.`
  };

  const res = await fetch("http://localhost:4000/api/v1/question-papers/analyze-syllabus-book", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    body: JSON.stringify(payload)
  });

  const json = await res.json();
  console.log("Status:", res.status);
  console.log("Success:", json.success);
  if (json.data) {
    console.log("Auto-Detected Course Title:", json.data.courseTitle);
    console.log("Auto-Detected Education Level:", json.data.educationLevel);
    console.log("Overall Coverage:", json.data.overallCoverage + "%");
    console.log("Mapped Chapters Count:", json.data.mappedChaptersCount);
    console.log("Missing Syllabus Topics:", json.data.missingSyllabusTopics?.length || 0);
    console.log("Extra Book Chapters (to skip):", json.data.extraBookChapters?.length || 0);
    console.log("First Mapped Chapter:", json.data.mappedChapters[0]?.chapterTitle);
    console.log("Extra Book Chapters Details:", json.data.extraBookChapters);
  } else {
    console.log("Response:", json);
  }
})();

