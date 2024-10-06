"use client";

import { useCallback, useEffect } from "react";
import { FiChevronsRight, FiX } from "react-icons/fi";
import Modal from "react-modal";
import useLocalStorageState from "use-local-storage-state";
import { NewsletterForm } from "./NewsletterSignup";
import { useScrollVisibility } from "./ShowAfterScrolling";

Modal.setAppElement("#__next");

export const NewsletterModalPopup = ({
  percentage = 1.5,
}: {
  percentage?: number;
}) => {
  const [dismissed, setDismissed] = useLocalStorageState(
    "newsletter-popup-dismissed",
    {
      defaultValue: false,
    }
  );
  const { visible, setVisible } = useScrollVisibility({
    percentage,
  });

  useScrollLock(visible && !dismissed);

  function closeModalForGood() {
    setVisible(false);
    setDismissed(true);
  }

  function closeModal() {
    setVisible(false);
  }

  if (dismissed) {
    return null;
  }

  return (
    <Modal
      isOpen={visible}
      onRequestClose={closeModal}
      contentLabel="Newsletter Popup Form"
      style={{
        overlay: {
          visibility: visible ? "visible" : "hidden",
          transition: "visibility 0.3s linear,opacity 0.3s linear",
          opacity: visible ? 1 : 0,
          zIndex: 300,
        },
        content: {
          visibility: visible ? "visible" : "hidden",
          transition: "visibility 0.3s linear,opacity 0.3s linear",
          opacity: visible ? 1 : 0,
          zIndex: 300,
        },
      }}
      className="fixed overflow-hidden flex items-center justify-center top-0 left-0 bg-white dark:bg-gray-800 w-screen h-screen"
    >
      <button
        onClick={closeModalForGood}
        className="absolute top-3 right-3 hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded-full"
      >
        <FiX className="w-6 h-6" />
      </button>
      <div className="w-3/6">
        <NewsletterForm
          heading={<h2 className="mt-0">Not subscribed yet?</h2>}
          text={
            <>
              <p className="mb-4">
                Join the Live and Learn Newsletter to receive bi-weekly insights
                straight to your inbox!
              </p>
              <ul className="list-disc list-inside mb-4">
                <li>✨ Inspiring quotes</li>
                <li>✍️ Exclusive posts on fascinating topics</li>
                <li>🖇️ Curated links to cutting-edge ideas</li>
                <li>🌌 Travel stories</li>
              </ul>
              <p className="mb-4">
                No spam. No noise. Just meaningful content to enrich your mind.
              </p>
            </>
          }
          link={
            <button
              onClick={closeModal}
              className="flex mt-10 justify-center items-center"
            >
              <span>Continue Reading for Now</span>
              <FiChevronsRight className="ml-2" />
            </button>
          }
        />
      </div>
    </Modal>
  );
};

export function useScrollLock(lock: boolean) {
  const lockScroll = useCallback(() => {
    document.body.style.overflow = "hidden";
  }, []);

  const unlockScroll = useCallback(() => {
    document.body.style.overflow = "auto";
  }, []);

  useEffect(() => {
    if (lock) {
      lockScroll();
    } else {
      unlockScroll();
    }

    return () => {
      unlockScroll();
    };
  }, [lock, lockScroll, unlockScroll]);
}
