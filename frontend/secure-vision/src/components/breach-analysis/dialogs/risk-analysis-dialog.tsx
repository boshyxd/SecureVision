import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BreachEntry } from "@/types";
import { Bot, Shield, AlertTriangle, CheckCircle, Mic, Send, StopCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/ui/markdown";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface RiskAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: BreachEntry;
  isAnalyzing: boolean;
  onAssessRisk?: (entry: BreachEntry) => Promise<void>;
}

export function RiskAnalysisDialog({
  open,
  onOpenChange,
  entry,
  isAnalyzing: parentIsAnalyzing,
  onAssessRisk,
}: RiskAnalysisDialogProps) {
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localEntry, setLocalEntry] = useState<BreachEntry | undefined>(entry);
  const [isAnalyzing, setIsAnalyzing] = useState(parentIsAnalyzing);
  const [showChat, setShowChat] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstMessage = useRef(true);

  const currentMessages = entry ? messagesMap[entry.id] || [] : [];

  const scrollToBottom = () => {
    if (!isFirstMessage.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    if (currentMessages.length > 0) {
      scrollToBottom();
      isFirstMessage.current = false;
    }
  }, [currentMessages]);

  // Update localEntry when entry prop changes
  useEffect(() => {
    setLocalEntry(entry);
  }, [entry]);

  // Update local analyzing state when parent state changes
  useEffect(() => {
    setIsAnalyzing(parentIsAnalyzing);
  }, [parentIsAnalyzing]);

  // Add initial message when risk assessment is completed
  useEffect(() => {
    if (entry && localEntry?.risk_assessment && currentMessages.length === 0) {
      // Short delay to ensure risk assessment content is visible first
      setTimeout(() => {
        const riskLevel = localEntry.risk_assessment?.risk_level || 'unknown';
        const riskScore = localEntry.risk_assessment?.risk_score || 0;
        
        updateMessages(entry.id, [{
          role: 'assistant',
          content: `I've completed the initial risk assessment for your credentials. The overall risk level is **${riskLevel.toUpperCase()}** with a risk score of **${riskScore}/100**.

Feel free to ask me any questions about:
- Specific security vulnerabilities
- How to implement the recommendations
- Best practices for credential security
- Additional security measures you can take`
        }]);
        setShowChat(true);
      }, 500);
    }
  }, [entry?.id, localEntry?.risk_assessment, currentMessages.length]);

  const updateMessages = (entryId: string, newMessages: Message[]) => {
    setMessagesMap(prev => ({
      ...prev,
      [entryId]: newMessages
    }));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm' // Use webm format for better compatibility
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          await processVoiceInput(audioBlob);
        } catch (error) {
          console.error('Error processing recording:', error);
        } finally {
          // Clean up
          chunksRef.current = [];
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            mediaRecorderRef.current = null;
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (error) {
        console.error('Error stopping recording:', error);
      } finally {
        setIsRecording(false);
      }
    }
  };

  const processVoiceInput = async (audioBlob: Blob) => {
    if (!entry) return;
    setIsProcessing(true);
    try {
      // Create form data with the audio file
      const formData = new FormData();
      // Create a File object from the Blob with a .webm extension
      const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
      formData.append('file', audioFile);
      formData.append('model', 'whisper-large-v3');

      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Whisper API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      if (data.text) {
        await sendMessage(data.text);
      } else {
        throw new Error('No transcription received');
      }
    } catch (error) {
      console.error('Error processing voice input:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || !entry) return;

    const newMessages = [
      ...currentMessages,
      { role: 'user', content } as Message
    ];
    updateMessages(entry.id, newMessages);
    setInput('');

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are a cybersecurity expert analyzing the security of the following credentials and helping secure them:
              URL: ${entry.url}
              Username: ${entry.username}
              Password: ${entry.password}
              Security Features: ${entry.metadata.hasCaptcha ? 'CAPTCHA, ' : ''}${entry.metadata.hasMfa ? 'MFA, ' : ''}${entry.metadata.isSecure ? 'HTTPS' : ''}
              Breach History: ${entry.metadata.breach_info?.is_breached ? 'Previously breached' : 'No known breaches'}
              ${entry.metadata.breach_info?.is_breached ? `Total Breaches: ${entry.metadata.breach_info.total_breaches}` : ''}
              ${entry.metadata.breach_info?.is_breached ? `Compromised Passwords: ${entry.metadata.breach_info.total_pwned}` : ''}
              
              Provide detailed security analysis and recommendations. Be specific about vulnerabilities and how to address them.
              Focus on practical steps the user can take to improve security.`
            },
            ...newMessages
          ],
          temperature: 0.7,
          max_tokens: 1024,
          top_p: 1,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from Groq');
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      let currentMessage = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            if (jsonStr === '[DONE]') continue;
            
            try {
              const json = JSON.parse(jsonStr);
              const content = json.choices[0]?.delta?.content || '';
              currentMessage += content;
              
              updateMessages(entry.id, [
                ...newMessages,
                { role: 'assistant', content: currentMessage }
              ]);
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message to Groq:', error);
    }
  };

  const handleAssessRisk = async () => {
    if (!localEntry) return;
    
    setIsAnalyzing(true);
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are a cybersecurity expert. Analyze the security of these credentials and provide a detailed risk assessment. Format your response as a valid JSON object without any additional text or explanation.

              Credentials to analyze:
              URL: ${localEntry.url}
              Username: ${localEntry.username}
              Password: ${localEntry.password}
              Security Features: ${localEntry.metadata.hasCaptcha ? 'CAPTCHA, ' : ''}${localEntry.metadata.hasMfa ? 'MFA, ' : ''}${localEntry.metadata.isSecure ? 'HTTPS' : ''}
              Breach History: ${localEntry.metadata.breach_info?.is_breached ? 'Previously breached' : 'No known breaches'}
              ${localEntry.metadata.breach_info?.is_breached ? `Total Breaches: ${localEntry.metadata.breach_info.total_breaches}` : ''}
              ${localEntry.metadata.breach_info?.is_breached ? `Compromised Passwords: ${localEntry.metadata.breach_info.total_pwned}` : ''}
              
              Respond with a JSON object using this exact structure:
              {
                "risk_level": "high|medium|low",
                "risk_score": <number between 0-100>,
                "analysis": "<detailed analysis text>",
                "factors": [
                  {
                    "name": "<factor name>",
                    "description": "<factor description>",
                    "impact": "negative|positive",
                    "weight": <number between 1-10>
                  }
                ],
                "recommendations": ["<recommendation1>", "<recommendation2>", ...]
              }`
            }
          ],
          temperature: 0.7,
          max_tokens: 1024,
          top_p: 1,
          stream: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Groq API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      let currentResponse = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            if (jsonStr === '[DONE]') continue;
            
            try {
              const json = JSON.parse(jsonStr);
              const content = json.choices[0]?.delta?.content || '';
              currentResponse += content;
              
              try {
                // Try to parse the accumulated JSON response
                const parsedResponse = JSON.parse(currentResponse);
                // Update the local entry with the partial risk assessment
                setLocalEntry(prev => prev ? {
                  ...prev,
                  risk_assessment: parsedResponse
                } : prev);
              } catch (e) {
                // Ignore JSON parse errors for partial responses
              }
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      }

      // After streaming is complete, call the parent's onAssessRisk
      if (onAssessRisk && localEntry) {
        await onAssessRisk(localEntry);
      }
    } catch (error) {
      console.error('Error assessing risk:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Add cleanup on dialog close
  React.useEffect(() => {
    if (!open) {
      // Stop recording if dialog is closed while recording
      if (isRecording) {
        stopRecording();
      }
      // Clean up any remaining streams
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        mediaRecorderRef.current = null;
      }
    }
  }, [open, isRecording]);

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] bg-black border-zinc-800 flex flex-col overflow-hidden">
        <DialogHeader className="flex-none pb-4">
          <DialogTitle className="font-mono text-lg flex items-center gap-2">
            <Bot className="h-5 w-5 text-emerald-500" />
            Risk Analysis
          </DialogTitle>
          <DialogDescription className="font-mono text-zinc-400">
            Powered by Groq LLaMA 3.3
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            <div className="space-y-4 pr-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                  <h3 className="font-mono text-sm font-medium text-zinc-200 mb-2">Target Information</h3>
                  <div className="grid grid-cols-[80px_1fr] gap-1 text-xs font-mono">
                    <span className="text-zinc-400">URL:</span>
                    <span className="text-zinc-200">{entry.url}</span>
                    <span className="text-zinc-400">Username:</span>
                    <span className="text-zinc-200">{entry.username}</span>
                    <span className="text-zinc-400">Password:</span>
                    <span className="text-zinc-200">{entry.password}</span>
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                  <h3 className="font-mono text-sm font-medium text-zinc-200 mb-2">Security Features</h3>
                  <div className="flex flex-wrap gap-2">
                    {entry.metadata.isSecure && (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono bg-emerald-950/30 text-emerald-400">
                        HTTPS
                      </span>
                    )}
                    {entry.metadata.hasCaptcha && (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono bg-blue-950/30 text-blue-400">
                        CAPTCHA
                      </span>
                    )}
                    {entry.metadata.hasMfa && (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono bg-purple-950/30 text-purple-400">
                        MFA
                      </span>
                    )}
                    {!entry.metadata.isSecure && !entry.metadata.hasCaptcha && !entry.metadata.hasMfa && (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono bg-red-950/30 text-red-400">
                        No Security Features
                      </span>
                    )}
                  </div>
                  <div className="mt-4">
                    <h4 className="font-mono text-sm font-medium text-zinc-200 mb-2">Breach Status</h4>
                    {entry.metadata.breach_info?.is_breached ? (
                      <div className="space-y-2">
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono bg-red-950/30 text-red-400">
                          {entry.metadata.breach_info.total_breaches} Known Breaches
                        </span>
                        <p className="text-xs font-mono text-zinc-400">
                          {entry.metadata.breach_info.total_pwned?.toLocaleString()} Compromised Passwords
                        </p>
                      </div>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono bg-emerald-950/30 text-emerald-400">
                        No Known Breaches
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-8 text-zinc-400">
                  <Bot className="h-8 w-8 mb-4 animate-pulse" />
                  <p className="text-sm font-mono">Analyzing security risks...</p>
                </div>
              ) : !localEntry?.risk_assessment ? (
                <div className="flex flex-col items-center justify-center py-8 text-zinc-400">
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="font-mono border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 text-zinc-400"
                    onClick={handleAssessRisk}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <Bot className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Bot className="mr-2 h-4 w-4" />
                        Begin Risk Analysis
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {localEntry.risk_assessment.risk_level === 'high' ? (
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        ) : localEntry.risk_assessment.risk_level === 'medium' ? (
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-emerald-500" />
                        )}
                        <span className={`font-mono text-sm font-medium ${
                          localEntry.risk_assessment.risk_level === 'high' ? 'text-red-400' :
                          localEntry.risk_assessment.risk_level === 'medium' ? 'text-amber-400' :
                          'text-emerald-400'
                        }`}>
                          {localEntry.risk_assessment.risk_level.toUpperCase()} RISK
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-zinc-400">Risk Score:</span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono ${
                          localEntry.risk_assessment.risk_score >= 70 ? 'bg-red-950/30 text-red-400' :
                          localEntry.risk_assessment.risk_score >= 40 ? 'bg-amber-950/30 text-amber-400' :
                          'bg-emerald-950/30 text-emerald-400'
                        }`}>
                          {localEntry.risk_assessment.risk_score}/100
                        </span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-mono text-sm font-medium text-zinc-200 mb-2">Analysis</h3>
                        <Markdown
                          content={localEntry.risk_assessment.analysis}
                          className="text-sm font-mono [&_*]:text-zinc-400"
                        />
                      </div>
                    </div>
                  </div>

                  {localEntry.risk_assessment.factors && localEntry.risk_assessment.factors.length > 0 && (
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                      <h3 className="font-mono text-sm font-medium text-zinc-200 mb-4">Risk Factors</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {localEntry.risk_assessment.factors.map((factor, index) => (
                          <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-black/20">
                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-mono ${
                              factor.impact === 'negative' ? 'bg-red-950/30 text-red-400' : 'bg-emerald-950/30 text-emerald-400'
                            }`}>
                              {factor.impact === 'negative' ? '-' : '+'}{factor.weight}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm font-mono text-zinc-200">{factor.name}</p>
                              <p className="text-xs font-mono text-zinc-500">{factor.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {localEntry.risk_assessment.recommendations && localEntry.risk_assessment.recommendations.length > 0 && (
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                      <h3 className="font-mono text-sm font-medium text-zinc-200 mb-4">Security Recommendations</h3>
                      <div className="grid grid-cols-1 gap-2">
                        {localEntry.risk_assessment.recommendations.map((rec, index) => (
                          <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-black/20">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 text-xs font-mono text-zinc-400">
                              {index + 1}
                            </span>
                            <p className="flex-1 text-sm font-mono text-zinc-400">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Only show chat interface after risk assessment and initial message */}
              {showChat && localEntry?.risk_assessment && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                  <h3 className="font-mono text-sm font-medium text-zinc-200 mb-4">Interactive Analysis</h3>
                  <div className="space-y-4">
                    {currentMessages.map((message, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex gap-2 p-3 rounded-lg",
                          message.role === 'assistant' 
                            ? "bg-zinc-900/50 text-zinc-200" 
                            : "bg-emerald-950/20 text-emerald-200"
                        )}
                      >
                        {message.role === 'assistant' ? (
                          <Bot className="h-5 w-5 flex-none mt-1" />
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex-none mt-1" />
                        )}
                        <div className="flex-1">
                          <Markdown
                            content={message.content}
                            className={cn(
                              "text-sm font-mono",
                              message.role === 'assistant' 
                                ? "[&_*]:text-zinc-200" 
                                : "[&_*]:text-emerald-200"
                            )}
                          />
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          {showChat && localEntry?.risk_assessment && (
            <div className="flex-none p-4 border-t border-zinc-800 bg-black/40">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "flex-none",
                    isRecording && "bg-red-500/20 text-red-400 border-red-500/50"
                  )}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                >
                  {isRecording ? (
                    <StopCircle className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
                <Input
                  className="flex-1 bg-zinc-950 border-zinc-800 font-mono"
                  placeholder="Ask about security recommendations..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="flex-none"
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 