"use client";
import { useCallback, useMemo, useRef } from 'react';
import { toast } from "sonner";
import Image from "next/image";
import Confetti from "react-confetti";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useAudio, useWindowSize, useMount } from "react-use";
import { reduceHearts } from "@/actions/user-progress";
import { challengeOptions, challenges } from "@/db/schema";
import { upsertChallengeProgress } from "@/actions/challenge-progress";
import  Header  from "./header";
import  Footer  from "./footer";
import  {ResultCard}  from "./result-card";
import  {QuestionBubble}  from "./question-bubble";
import Challenge from './challenge';
import { useHeartsModal } from "@/store/use-hearts-modal";
import { usePracticeModal } from "@/store/use-practice-modal";


type Props = {
  initialPercentage: number;
  initialHearts: number;
  initialLessonId: number;
  initialLessonChallenges: (typeof challenges.$inferSelect & {
    completed: boolean;
    challengeOptions: typeof challengeOptions.$inferSelect[];
  })[];
  hasActiveSubscription: boolean;
};

export const Quiz = ({
  initialPercentage,
  initialHearts,
  initialLessonId,
  initialLessonChallenges,
  hasActiveSubscription,
}: Props) => {
  const { open: openHeartsModal } = useHeartsModal();
  const { open: openPracticeModal } = usePracticeModal();
  useMount(() => {
    if (initialPercentage === 100) {
      openPracticeModal();
    }
  });
  const isFinishAudioPlayedRef = useRef(false);

  const { width, height } = useWindowSize();
  const router = useRouter();

  const [finishAudio, , finishControls] = useAudio({
    src: "/finish.mp3",
    autoPlay: false,
   
  });
  const [correctAudio, , correctControls] = useAudio({
    src: "/correct.wav",
    autoPlay: false,
  });
  const [incorrectAudio, , incorrectControls] = useAudio({
    src: "/incorrect.wav",
    autoPlay: false,
  });

  const [pending, startTransition] = useTransition();
  const [lessonId] = useState(initialLessonId);
  const [hearts, setHearts] = useState(initialHearts);
  const [percentage, setPercentage] = useState(() => {
    return initialPercentage === 100 ? 0 : initialPercentage;
  });
  const [challenges] = useState(() => initialLessonChallenges);//函数式初始值，仅挂载时执行一次
  const [activeIndex, setActiveIndex] = useState(() => {
    const uncompletedIndex = challenges.findIndex((challenge) => !challenge.completed);
    return uncompletedIndex === -1 ? 0 : uncompletedIndex;
  });
  const [selectedOption, setSelectedOption] = useState<number>();
  const [status, setStatus] = useState<"correct" | "wrong" | "none">("none");

  const challenge = challenges[activeIndex];
  const options = useMemo(() => challenge?.challengeOptions || [], [challenge]);

  const onNext = useCallback(() => {
    setActiveIndex((current) => {
      const nextIndex = current + 1;
      return nextIndex >= challenges.length ? -1 : nextIndex;
    });
  }, [challenges.length]); 

  const onSelect = useCallback((id: number) => {
    if (status !== "none") return;
    setSelectedOption(id);
  }, [status]); 

  useEffect(() => {
    if (!challenge && !isFinishAudioPlayedRef.current) {
      finishControls.play();
      isFinishAudioPlayedRef.current = true;
    }
  }, [challenge, finishControls]);

  const onContinue = useCallback(() => {
    if (!selectedOption) return;
    if (status === "wrong") {
      setStatus("none");
      setSelectedOption(undefined);
      return;
    }
    if (status === "correct") {
      onNext();
      setStatus("none");
      setSelectedOption(undefined);
      return;
    }
    const correctOption = options.find((option) => option.correct);
    if (!correctOption) {
      return;
    }
    if (correctOption.id === selectedOption) {
      startTransition(() => {
        upsertChallengeProgress(challenge.id)
          .then((response) => {
            if (response?.error === "hearts") {
              openHeartsModal();
              return;
            }
            correctControls.play();
            setStatus("correct");
            setPercentage((prev) => prev + 100 / challenges.length);
            if (initialPercentage === 100) {
              setHearts((prev) => Math.min(prev + 1, 5));
            }
          })
          .catch(() => toast.error("Something went wrong. Please try again."));
      });
    } else {
      startTransition(() => {
        reduceHearts(challenge.id)
          .then((response) => {
            if (response?.error === "hearts") {
              openHeartsModal();
              return;
            }
            incorrectControls.play();
            setStatus("wrong");
            if (!response?.error) {
              setHearts((prev) => Math.max(prev - 1, 0));
            }
          })
          .catch(() => toast.error("Something went wrong. Please try again."));
      });
    }
  }, [
  selectedOption,
  status,
  options,
  challenge,
  openHeartsModal,
  correctControls,
  challenges.length,
  initialPercentage,
  incorrectControls,
  onNext,
]);

  return (
    <>
      {incorrectAudio.type && <incorrectAudio.type {...incorrectAudio.props} style={{ display: "none" }} />}
      {correctAudio.type && <correctAudio.type {...correctAudio.props} style={{ display: "none" }} />}
      {finishAudio.type && <finishAudio.type {...finishAudio.props} style={{ display: "none" }} />}
      
      {!challenge ? (
        <>
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={500}
            tweenDuration={10000}
          />
          <div className="flex flex-col gap-y-4 lg:gap-y-8 max-w-lg mx-auto text-center items-center justify-center h-full">
            <Image
              src="/finish.svg"
              alt="Finish"
              className="hidden lg:block"
              height={100}
              width={100}
            />
            <Image
              src="/finish.svg"
              alt="Finish"
              className="block lg:hidden"
              height={50}
              width={50}
            />
            <h1 className="text-xl lg:text-3xl font-bold text-neutral-700">
              Great job! <br /> You&apos;ve completed the lesson.
            </h1>
            <div className="flex items-center gap-x-4 w-full">
              <ResultCard
                variant="points"
                value={challenges.length * 10}
              />
              <ResultCard
                variant="hearts"
                value={hearts}
              />
            </div>
          </div>
          <Footer
            lessonId={lessonId}
            status="completed"
            onCheck={() => router.push("/learn")}
          />
        </>
      ) : (
        <>
          <Header
            hearts={hearts}
            percentage={percentage}
            hasActiveSubscription={hasActiveSubscription}
          />
          <div className="flex-1">
            <div className="h-full flex items-center justify-center">
              <div className="lg:min-h-87.5 lg:w-150 w-full px-6 lg:px-0 flex flex-col gap-y-12">
                <h1 className="text-lg lg:text-3xl text-center lg:text-start font-bold text-neutral-700 flex justify-center items-center">
                  {challenge.type === "ASSIST" ? "Select the correct meaning" : challenge.question}
                </h1>
                <div>
                  {challenge.type === "ASSIST" && (
                    <QuestionBubble question={challenge.question} />
                  )}
                  <Challenge
                    options={options}
                    onSelect={onSelect}
                    status={status}
                    selectedOption={selectedOption}
                    disabled={pending}
                    type={challenge.type}
                  />
                </div>
              </div>
            </div>
          </div>
          <Footer
            disabled={pending || !selectedOption}
            status={status}
            onCheck={onContinue}
          />
        </>
      )}
    </>
  );
};