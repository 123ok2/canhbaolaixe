/**
 * Hook to manage User Camera Access and Video Stream
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface CameraState {
  hasPermission: boolean | null; // null = pending, true = granted, false = denied
  isStreaming: boolean;
  error: string | null;
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>({
    hasPermission: null,
    isStreaming: false,
    error: null
  });

  const startCamera = useCallback(async () => {
    setCameraState({ hasPermission: null, isStreaming: false, error: null });

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt của bạn không hỗ trợ truy cập camera (getUserMedia).');
      }

      // Try user front camera first
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 30 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
          setCameraState({
            hasPermission: true,
            isStreaming: true,
            error: null
          });
        };
      } else {
        setCameraState({
          hasPermission: true,
          isStreaming: true,
          error: null
        });
      }
    } catch (err: unknown) {
      console.warn('Camera access denied or unavailable:', err);
      let msg = 'Không thể truy cập camera.';
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg = 'Quyền truy cập camera đã bị từ chối. Vui lòng cho phép quyền camera trong cài đặt trình duyệt để tiếp tục.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          msg = 'Không tìm thấy thiết bị camera trên thiết bị của bạn.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          msg = 'Camera hiện đang được sử dụng bởi ứng dụng khác.';
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }

      setStream(null);
      setCameraState({
        hasPermission: false,
        isStreaming: false,
        error: msg
      });
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
    setCameraState((prev) => ({ ...prev, isStreaming: false }));
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    stream,
    cameraState,
    startCamera,
    stopCamera
  };
}
