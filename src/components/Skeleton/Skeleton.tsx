import s from './Skeleton.module.scss';

type SkeletonProps = {
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  count?: number;
};

export default function Skeleton({
  width = '100%',
  height = '1rem',
  rounded = false,
  count = 1,
}: SkeletonProps) {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: rounded ? '999px' : '4px',
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={s.skeleton} style={style} aria-hidden="true" />
      ))}
    </>
  );
}
