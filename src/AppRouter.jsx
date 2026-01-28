import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { useState, lazy, Suspense, useEffect } from "react";
import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { Home } from "./components/Home";
import { ChapterSelection } from "./components/ChapterSelection";
import { CapabilityError } from "./components/CapabilityError";
import { OldBrowserError } from "./components/OldBrowserError";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { checkCapabilities, isOldBrowser } from "./utils/capabilityChecker";
import { lazyWithRetry } from "./utils/lazyWithRetry";
import { isAndroid } from "./utils/deviceDetector";
import { checkAuthStatus, isAuthenticated } from "./utils/auth";
import { CourseLabs } from "./components/CourseLabs";
import { FinalProjectPage } from "./components/FinalProjectPage";
import { QuizPage } from "./components/QuizPage";

// Lazy load heavy components for better TV performance with retry logic
const Experience = lazyWithRetry(() => import("./components/Experience").then(module => ({ default: module.Experience })));
const UI = lazyWithRetry(() => import("./components/UI").then(module => ({ default: module.UI })));
const ImageBackground = lazyWithRetry(() => import("./components/ImageBackground").then(module => ({ default: module.ImageBackground })));
const LabPage = lazyWithRetry(() => import("./components/LabPage").then(module => ({ default: module.LabPage })));

// Protected Route Component
const ProtectedRoute = ({ children, authenticated }) => {
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Learning Page Component
const LearningPage = ({ authenticated }) => {
  const { courseId, chapterId } = useParams();
  const navigate = useNavigate();
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [pdfPageNumber, setPdfPageNumber] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.0);
  const [pdfNumPages, setPdfNumPages] = useState(null);
  const [isCanvasReady, setIsCanvasReady] = useState(false);

  useEffect(() => {
    const loadChapter = async () => {
      if (!courseId || !chapterId) {
        navigate("/", { replace: true });
        return;
      }

      try {
        const API_URL = import.meta.env.VITE_API_URL ;
        const response = await fetch(`${API_URL}/api/courses/${courseId}/chapters/${chapterId}`, {
          credentials: 'include'
        });

        if (response.ok) {
          const chapter = await response.json();
          const courseResponse = await fetch(`${API_URL}/api/courses/${courseId}`, {
            credentials: 'include'
          });
          
          if (courseResponse.ok) {
            const course = await courseResponse.json();
            setSelectedChapter({
              ...chapter,
              courseId: course.id,
              courseName: course.courseName,
              courseDescription: course.courseDescription
            });
          } else {
            setSelectedChapter({
              ...chapter,
              courseId: courseId,
              courseName: "Cours",
              courseDescription: ""
            });
          }
        } else {
          navigate("/", { replace: true });
        }
      } catch (error) {
        console.error("Error loading chapter:", error);
        navigate("/", { replace: true });
      }
    };

    loadChapter();
  }, [courseId, chapterId, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCanvasReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSelectChapter = (chapter) => {
    navigate(`/courses/${chapter.courseId}/chapters/${chapter.id}/learn`);
  };

  const handleOpenLab = (course, lab = null) => {
    const courseId = course?.courseId || course?.id;
    if (!courseId) return;

    if (lab) {
      // Navigate to specific lab
      navigate(`/courses/${courseId}/labs/${lab.id}`);
    } else if (course && course.hasStatements) {
      // Legacy: navigate to old lab page
      navigate(`/courses/${courseId}/lab`);
    } else {
      // Navigate to labs list page for the course
      navigate(`/courses/${courseId}/labs`);
    }
  };

  const handleOpenFinalProject = async (course, finalProject) => {
    navigate(`/courses/${course.courseId || course.id}/final-project`);
  };

  if (!selectedChapter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pink-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-700">Chargement du chapitre...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Loader />
       <Leva hidden /> 

      {/* Image Background */}
      <ErrorBoundary componentName="Image Reader">
        <Suspense fallback={
          <div className="fixed inset-0 z-0 bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-xl">Chargement des images...</p>
            </div>
          </div>
        }>
          <ImageBackground
            document={selectedChapter}
            pageNumber={pdfPageNumber}
            setPageNumber={setPdfPageNumber}
            scale={pdfScale}
            setScale={setPdfScale}
            numPages={pdfNumPages}
            setNumPages={setPdfNumPages}
          />
        </Suspense>
      </ErrorBoundary>

      {/* Avatar Canvas */}
      {isCanvasReady && (
        <ErrorBoundary componentName="3D Avatar">
          <Canvas
            shadows
            camera={{ position: [0, 0, 1], fov: 30 }}
            dpr={[1, 2]}
            performance={{ min: 0.5 }}
            style={{
              width: "50%",
              height: "100%",
              position: "fixed",
              top: 0,
              right: 0,
              zIndex: 10,
            }}
            gl={{
              antialias: false,
              powerPreference: "high-performance",
              stencil: false,
              depth: true
            }}
          >
            <Suspense fallback={null}>
              <Experience />
            </Suspense>
          </Canvas>
        </ErrorBoundary>
      )}

      {/* UI Component */}
      <ErrorBoundary componentName="UI Component">
        <Suspense fallback={
          <div className="fixed inset-0 z-20 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white text-lg">Loading UI...</p>
            </div>
          </div>
        }>
          <UI
            pdfReaderOpen={true}
            selectedCourse={selectedChapter}
            onBackToHome={() => navigate(`/courses/${courseId}/chapters`)}
            onSelectChapter={handleSelectChapter}
            pdfPageNumber={pdfPageNumber}
            setPdfPageNumber={setPdfPageNumber}
            pdfScale={pdfScale}
            setPdfScale={setPdfScale}
            pdfNumPages={pdfNumPages}
            onOpenLab={handleOpenLab}
            onOpenFinalProject={handleOpenFinalProject}
          />
        </Suspense>
      </ErrorBoundary>
    </>
  );
};

// Chapters Page Component
const ChaptersPage = ({ authenticated }) => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCourse = async () => {
      if (!courseId) {
        navigate("/", { replace: true });
        return;
      }

      try {
        const API_URL = import.meta.env.VITE_API_URL ;
        const response = await fetch(`${API_URL}/api/courses/${courseId}`, {
          credentials: 'include'
        });

        if (response.ok) {
          const courseData = await response.json();
          setCourse(courseData);
        } else {
          navigate("/", { replace: true });
        }
      } catch (error) {
        console.error("Error loading course:", error);
        navigate("/", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [courseId, navigate]);

  const handleSelectChapter = (chapter) => {
    navigate(`/courses/${courseId}/chapters/${chapter.id}/learn`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pink-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-700">Chargement du cours...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <ChapterSelection
      course={course}
      onSelectChapter={handleSelectChapter}
      onBackToHome={() => navigate("/")}
    />
  );
};

// Labs Page Component
const LabsPage = ({ authenticated }) => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCourse = async () => {
      if (!courseId) {
        navigate("/", { replace: true });
        return;
      }

      try {
        const API_URL = import.meta.env.VITE_API_URL ;
        const response = await fetch(`${API_URL}/api/courses/${courseId}`, {
          credentials: 'include'
        });

        if (response.ok) {
          const courseData = await response.json();
          setCourse(courseData);
        } else {
          navigate("/", { replace: true });
        }
      } catch (error) {
        console.error("Error loading course:", error);
        navigate("/", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [courseId, navigate]);

  const handleSelectLab = (course, lab) => {
    navigate(`/courses/${courseId}/labs/${lab.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pink-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-700">Chargement des labs...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <CourseLabs
      course={course}
      onBackToHome={() => navigate("/")}
      onSelectLab={handleSelectLab}
    />
  );
};

// Lab Page Component
const LabDetailPage = ({ authenticated }) => {
  const { courseId, labId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lab, setLab] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!courseId || !labId) {
        navigate("/", { replace: true });
        return;
      }

      try {
        const API_URL = import.meta.env.VITE_API_URL ;
        
        const [courseResponse, labsResponse] = await Promise.all([
          fetch(`${API_URL}/api/courses/${courseId}`, { credentials: 'include' }),
          fetch(`${API_URL}/api/courses/${courseId}/labs`, { credentials: 'include' })
        ]);

        if (courseResponse.ok && labsResponse.ok) {
          const courseData = await courseResponse.json();
          const labs = await labsResponse.json();
          const labsArray = Array.isArray(labs) ? labs : [];
          const foundLab = labsArray.find(l => l.id === labId);
          
          setCourse(courseData);
          setLab(foundLab || null);
        } else {
          navigate("/", { replace: true });
        }
      } catch (error) {
        console.error("Error loading lab:", error);
        navigate("/", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courseId, labId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pink-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-700">Chargement du lab...</p>
        </div>
      </div>
    );
  }

  if (!course || !lab) {
    return null;
  }

  return (
    <LabPage
      onBackToHome={() => navigate("/")}
      course={course}
      lab={lab}
    />
  );
};

// Final Project Page Component
const FinalProjectRoute = ({ authenticated }) => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [finalProject, setFinalProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    // Prevent multiple loads
    if (hasLoaded || !courseId) {
      if (!courseId) {
        navigate("/", { replace: true });
      }
      return;
    }

    let isMounted = true;

    const loadData = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL ;
        
        const [courseResponse, projectResponse] = await Promise.all([
          fetch(`${API_URL}/api/courses/${courseId}`, { credentials: 'include' }),
          fetch(`${API_URL}/api/courses/${courseId}/final-project`, { credentials: 'include' })
        ]);

        if (!isMounted) return;

        if (courseResponse.ok) {
          const courseData = await courseResponse.json();
          setCourse(courseData);
          
          if (projectResponse.ok) {
            const projectData = await projectResponse.json();
            setFinalProject(projectData);
          } else {
            // Project doesn't exist, but course does - that's okay
            setFinalProject(null);
          }
        } else {
          navigate("/", { replace: true });
        }
      } catch (error) {
        console.error("Error loading final project:", error);
        if (isMounted) {
          navigate("/", { replace: true });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setHasLoaded(true);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]); // Only depend on courseId, navigate is stable

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pink-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-700">Chargement du projet final...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <FinalProjectPage
      course={course}
      finalProject={finalProject}
      onBackToHome={() => navigate("/")}
    />
  );
};

export const AppRouter = ({ authenticated, authChecking, capabilityCheckDone, capabilities, onRetryCapabilityCheck, onLoginSuccess }) => {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const navigate = useNavigate();

  // Make handleOpenLabs available globally for Home component
  useEffect(() => {
    window.handleOpenLabs = (course) => {
      navigate(`/courses/${course.id}/labs`);
    };
    return () => {
      delete window.handleOpenLabs;
    };
  }, [navigate]);

  const handleStartLearning = async (course) => {
    // If it's already a chapter (has courseId), start learning directly
    if (course.courseId) {
      navigate(`/courses/${course.courseId}/chapters/${course.id}/learn`);
      return;
    }

    // This is a course, fetch chapters and select the first one
    try {
      const API_URL = import.meta.env.VITE_API_URL ;
      const response = await fetch(`${API_URL}/api/courses/${course.id}/chapters`, {
        credentials: 'include'
      });

      if (response.ok) {
        const chapters = await response.json();
        const chaptersArray = Array.isArray(chapters) ? chapters : [];

        if (chaptersArray.length > 0) {
          // Navigate to first chapter
          navigate(`/courses/${course.id}/chapters/${chaptersArray[0].id}/learn`);
        } else {
          // No chapters available, show chapter selection view
          navigate(`/courses/${course.id}/chapters`);
        }
      } else {
        // Error fetching chapters, show chapter selection view
        navigate(`/courses/${course.id}/chapters`);
      }
    } catch (error) {
      console.error("Error loading chapters:", error);
      navigate(`/courses/${course.id}/chapters`);
    }
  };

  // Check for old browser first
  if (isOldBrowser()) {
    return <OldBrowserError />;
  }

  // Show loading if checking auth
  if (authChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  // Show capability error if requirements not met
  if (capabilityCheckDone && capabilities && !capabilities.supported) {
    const hasOldBrowserError = capabilities.errors?.some(err => err.isOldBrowser);
    if (hasOldBrowserError) {
      return <OldBrowserError />;
    }
    return <CapabilityError onRetry={onRetryCapabilityCheck} />;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        authenticated ? <Navigate to="/" replace /> : <Navigate to="/" replace />
      } />

      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute authenticated={authenticated}>
          {!capabilityCheckDone ? (
            <div className="fixed inset-0 z-50 bg-gray-900 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>Checking system requirements...</p>
              </div>
            </div>
          ) : (
            <Home onStartLearning={handleStartLearning} />
          )}
        </ProtectedRoute>
      } />

      <Route path="/courses/:courseId/chapters" element={
        <ProtectedRoute authenticated={authenticated}>
          <ChaptersPage authenticated={authenticated} />
        </ProtectedRoute>
      } />

      <Route path="/courses/:courseId/chapters/:chapterId/learn" element={
        <ProtectedRoute authenticated={authenticated}>
          <LearningPage authenticated={authenticated} />
        </ProtectedRoute>
      } />

      <Route path="/courses/:courseId/labs" element={
        <ProtectedRoute authenticated={authenticated}>
          <LabsPage authenticated={authenticated} />
        </ProtectedRoute>
      } />

      <Route path="/courses/:courseId/labs/:labId" element={
        <ProtectedRoute authenticated={authenticated}>
          <LabDetailPage authenticated={authenticated} />
        </ProtectedRoute>
      } />

      <Route path="/courses/:courseId/lab" element={
        <ProtectedRoute authenticated={authenticated}>
          <LabDetailPage authenticated={authenticated} />
        </ProtectedRoute>
      } />

      <Route path="/courses/:courseId/final-project" element={
        <ProtectedRoute authenticated={authenticated}>
          <FinalProjectRoute authenticated={authenticated} />
        </ProtectedRoute>
      } />

      <Route path="/courses/:courseId/chapters/:chapterId/quiz" element={
        <ProtectedRoute authenticated={authenticated}>
          <QuizPage />
        </ProtectedRoute>
      } />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
