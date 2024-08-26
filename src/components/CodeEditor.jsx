import { useRef, useState, useEffect } from "react";
import {
  Box,
  VStack,
  Text,
  Button,
  Flex,
  Container,
  Tooltip,
  useBreakpointValue,
  IconButton,
  useDisclosure,
} from "@chakra-ui/react";
import { Editor } from "@monaco-editor/react";
import { CODE_SNIPPETS } from "../constants";
import { executeCode } from "../api";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

const CodeEditor = () => {
  const editorRef = useRef(null);
  const [value, setValue] = useState("");
  const [language, setLanguage] = useState("python");
  const [errors, setErrors] = useState({});
  const [output, setOutput] = useState("");
  const [activeError, setActiveError] = useState(null);

  const { isOpen, onToggle } = useDisclosure();
  const editorHeight = useBreakpointValue({ base: "50vh", md: "calc(100vh - 100px)" });

  const onMount = (editor) => {
    editorRef.current = editor;
    editor.focus();
  };

  const handleEditorChange = (newValue) => {
    setValue(newValue);
  };

  const runCode = async () => {
    const sourceCode = editorRef.current.getValue();
    if (!sourceCode) return;

    try {
      const result = await executeCode(language, sourceCode);

      const errorLines = result.run.stderr ? result.run.stderr.split("\n") : [];
      const outputLines = result.run.stdout || "";

      const errorMap = {};
      errorLines.forEach((line) => {
        const match = line.match(/line (\d+)/);
        if (match) {
          const lineNumber = parseInt(match[1], 10) - 1;
          errorMap[lineNumber] = line;
        }
      });

      setErrors(errorMap);
      setOutput(outputLines);

      if (editorRef.current) {
        const decorations = Object.keys(errorMap).map((lineNumber) => ({
          range: new monaco.Range(parseInt(lineNumber, 10) + 1, 1, parseInt(lineNumber, 10) + 1, 1),
          options: {
            isWholeLine: true,
            className: 'error-decoration',
            glyphMarginClassName: 'error-icon',
            hoverMessage: { value: errorMap[lineNumber] }
          }
        }));
        editorRef.current.deltaDecorations([], decorations);
      }
    } catch (error) {
      console.error("Error executing code:", error);
    }
  };

  useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorRef.current.deltaDecorations([], []);
      }
    };
  }, [errors]);

  return (
    <Container maxW="container.lg" p={2}>
      <Flex direction={{ base: "column", md: "row" }} height="100vh" gap={2}>
        {/* Collapsible Sidebar */}
        <Box
          width={{ base: "100%", md: isOpen ? "200px" : "40px" }}
          p={isOpen ? "2" : "1"}
          backgroundColor="gray.700"
          color="white"
          display="flex"
          flexDirection="column"
          borderRadius="md"
          shadow="lg"
          transition="width 0.3s ease"
          overflow="hidden"
        >
          <IconButton
            aria-label="Toggle Sidebar"
            icon={isOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            onClick={onToggle}
            colorScheme="whiteAlpha"
            mb={2}
            alignSelf={isOpen ? "flex-end" : "center"}
            size="sm"
          />
          {isOpen && (
            <VStack align="start" spacing={2} overflowY="auto" height="100%">
              <Text fontSize="sm" color="gray.300" fontWeight="bold">
                Output
              </Text>
              <Box
                p="1"
                backgroundColor="gray.800"
                borderRadius="md"
                whiteSpace="pre-wrap"
                width="100%"
                height="80px"
                overflowY="auto"
                border="1px solid"
                borderColor="gray.600"
                shadow="md"
              >
                <Text fontSize="xs" color="gray.100">
                  {output || "Output will appear here"}
                </Text>
              </Box>
              <Text fontSize="sm" color="gray.300" fontWeight="bold">
                Errors
              </Text>
              <Box
                p="1"
                backgroundColor="gray.800"
                borderRadius="md"
                whiteSpace="pre-wrap"
                width="100%"
                height="120px"
                overflowY="auto"
                border="1px solid"
                borderColor="gray.600"
                shadow="md"
              >
                {Object.keys(errors).length > 0 ? (
                  Object.entries(errors).map(([lineNumber, error]) => (
                    <Tooltip
                      key={lineNumber}
                      label={error}
                      aria-label={`Error at line ${parseInt(lineNumber, 10) + 1}`}
                      placement="right"
                      maxW="300px" // Limit the tooltip width
                      className="tooltip-custom" // Apply custom class
                    >
                      <Text
                        fontSize="xs"
                        color="red.300"
                        cursor="pointer"
                        onMouseEnter={() => setActiveError({ lineNumber, error })}
                        onMouseLeave={() => setActiveError(null)}
                      >
                        Line {parseInt(lineNumber, 10) + 1}: {error}
                      </Text>
                    </Tooltip>
                  ))
                ) : (
                  <Text fontSize="xs" color="gray.300">
                    No errors
                  </Text>
                )}
              </Box>
              {activeError && (
                <Box
                  p="1"
                  backgroundColor="gray.800"
                  borderRadius="md"
                  whiteSpace="pre-wrap"
                  border="1px solid"
                  borderColor="gray.600"
                  shadow="md"
                >
                  <Text fontSize="xs" color="gray.100">
                    {activeError.error}
                  </Text>
                </Box>
              )}
            </VStack>
          )}
        </Box>

        {/* Code Editor */}
        <Box
          flex="1"
          borderRadius="md"
          overflow="hidden"
          shadow="lg"
          height={editorHeight}
          width="100%"
        >
          <Box
            height="100%"
            borderRadius="md"
            overflow="hidden"
            position="relative"
            backgroundColor="gray.900"
            shadow="lg"
          >
            <Editor
              options={{
                minimap: { enabled: false },
                lineNumbersMinChars: 2,
                scrollbar: {
                  verticalScrollbarSize: 6,
                  horizontalScrollbarSize: 6,
                },
                glyphMargin: true,
              }}
              height={editorHeight}
              theme="vs-dark"
              language={language}
              defaultValue={CODE_SNIPPETS[language]}
              onMount={onMount}
              value={value}
              onChange={handleEditorChange}
            />
            <Button
              position="absolute"
              bottom="8px"
              right="8px"
              size="xs"
              colorScheme="green"
              onClick={runCode}
              shadow="md"
            >
              Run
            </Button>
          </Box>
        </Box>
      </Flex>
    </Container>
  );
};

export default CodeEditor;

// Custom CSS for error icon and tooltip
const style = document.createElement('style');
style.innerHTML = `
  .error-icon::before {
    content: '⚠️';
    color: yellow;
    font-size: 12px;
    line-height: 1;
    display: inline-block;
    margin-right: 3px;
  }
  .error-decoration {
    background-color: rgba(255, 0, 0, 0.1);
  }
  .tooltip-custom .chakra-tooltip__content {
    max-height: 60px; /* Limit the tooltip height */
    overflow-y: auto; /* Add scroll if content overflows */
  }
`;
document.head.appendChild(style);
