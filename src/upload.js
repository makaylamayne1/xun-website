
import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { useDropzone } from 'react-dropzone';
import { RotateCcw, RotateCw, X } from 'react-feather';

const Wrapper = styled.div`
  padding: 20px;
`;

const DropArea = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 140px;
  border: 2px dashed #ccc;
  border-radius: 10px;
  background: #fafafa;
  color: #777;
  cursor: pointer;
  margin-bottom: 20px;
`;

const PagesRow = styled.div`
  display: flex;
  gap: 20px;
  overflow-x: auto;
  padding-bottom: 10px;
`;

const PageCard = styled.div`
  position: relative;
  min-width: 180px;
  border: 1px solid #ddd;
  border-radius: 12px;
  padding: 12px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`;

const PreviewImg = styled.img`
  width: 100%;
  max-width: 160px;
  height: auto;
  display: block;
  margin: 0 auto 10px;
  transition: transform 0.3s ease;
`;

const Controls = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
`;

const IconButton = styled.button`
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 4px;
`;

const RemoveButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  border: none;
  background: #cf3139;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
`;

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const Upload = () => {
  const [pages, setPages] = useState([]);

  const onDrop = useCallback(async (acceptedFiles) => {
    const newPages = [];

    for (const file of acceptedFiles) {
      const fileUrl = await readFileAsDataURL(file);

      newPages.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        name: file.name,
        preview: fileUrl,
        rotation: 0,
        pageNumber: 1,
      });
    }

    setPages((prev) => [...prev, ...newPages]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': [],
      'image/*': [],
    },
  });

  const rotatePage = (id, degrees) => {
    setPages((prev) =>
      prev.map((page) =>
        page.id === id
          ? { ...page, rotation: page.rotation + degrees }
          : page
      )
    );
  };

  const removePage = (id) => {
    setPages((prev) => prev.filter((page) => page.id !== id));
  };

  return (
    <Wrapper>
      <DropArea {...getRootProps()}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop files here...</p>
        ) : (
          <p>Drag & drop a PDF or image here, or click to upload</p>
        )}
      </DropArea>

      {pages.length > 0 && (
        <PagesRow>
          {pages.map((page, index) => (
            <PageCard key={page.id}>
              <RemoveButton onClick={() => removePage(page.id)}>
                <X size={14} />
              </RemoveButton>

              <PreviewImg
                src={page.preview}
                alt={page.name}
                style={{ transform: `rotate(${page.rotation}deg)` }}
              />

              <Controls>
                <IconButton onClick={() => rotatePage(page.id, -90)}>
                  <RotateCcw size={18} />
                </IconButton>

                <span>Page {page.pageNumber ?? index + 1}</span>

                <IconButton onClick={() => rotatePage(page.id, 90)}>
                  <RotateCw size={18} />
                </IconButton>
              </Controls>
            </PageCard>
          ))}
        </PagesRow>
      )}
    </Wrapper>
  );
};

export default Upload;