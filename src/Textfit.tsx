import React, { Component, ReactNode, CSSProperties, ReactElement } from 'react';
import PropTypes from 'prop-types';
import shallowEqual from './utils/shallowEqual';
import series from './utils/series';
import whilst from './utils/whilst';
import throttle from './utils/throttle';
import uniqueId from './utils/uniqueId';
import { innerWidth, innerHeight } from './utils/innerSize';

function assertElementFitsWidth(el: HTMLElement, width: number): boolean {
    // -1: temporary bugfix, will be refactored soon
    return el.scrollWidth - 1 <= width;
}

function assertElementFitsHeight(el: HTMLElement, height: number): boolean {
    // -1: temporary bugfix, will be refactored soon
    return el.scrollHeight - 1 <= height;
}

function noop(): void {}

export interface TextfitProps {
    children?: ReactNode;
    text?: string;
    min?: number;
    max?: number;
    mode?: 'single' | 'multi';
    forceSingleModeWidth?: boolean;
    throttle?: number;
    autoResize?: boolean;
    onReady?: (fontSize: number) => void;
    style?: CSSProperties;
    [key: string]: any; // For additional props passed to the div
}

interface TextfitState {
    fontSize: number | null;
    ready: boolean;
}

class Textfit extends Component<TextfitProps, TextfitState> {
    static propTypes = {
        children: PropTypes.node,
        text: PropTypes.string,
        min: PropTypes.number,
        max: PropTypes.number,
        mode: PropTypes.oneOf([
            'single', 'multi'
        ]),
        forceSingleModeWidth: PropTypes.bool,
        throttle: PropTypes.number,
        onReady: PropTypes.func,
        autoResize: PropTypes.bool
    };

    static defaultProps = {
        min: 1,
        max: 100,
        mode: 'multi',
        forceSingleModeWidth: true,
        throttle: 50,
        autoResize: true,
        onReady: noop
    };

    private _parent: HTMLDivElement | null = null;
    private _child: HTMLDivElement | null = null;
    private pid: string | number = '';
    private handleWindowResize: () => void;

    constructor(props: TextfitProps) {
        super(props);
        if ('perfectFit' in props) {
            console.warn('TextFit property perfectFit has been removed.');
        }

        this.state = {
            fontSize: null,
            ready: false
        };
        
        // Initialize the handleWindowResize method
        this.handleWindowResize = this.processResize.bind(this);
        this.handleWindowResize = throttle(this.handleWindowResize, props.throttle || 50);
    }

    componentDidMount(): void {
        const { autoResize } = this.props;
        if (autoResize) {
            window.addEventListener('resize', this.handleWindowResize);
        }
        this.process();
    }

    componentDidUpdate(prevProps: TextfitProps): void {
        const { ready } = this.state;
        if (!ready) return;
        if (shallowEqual(this.props, prevProps)) return;
        this.process();
    }

    componentWillUnmount(): void {
        const { autoResize } = this.props;
        if (autoResize) {
            window.removeEventListener('resize', this.handleWindowResize);
        }
        // Setting a new pid will cancel all running processes
        this.pid = uniqueId();
    }

    processResize(): void {
        this.process();
    }

    process(): void {
        const { min, max, mode, forceSingleModeWidth, onReady } = this.props;
        const el = this._parent;
        const wrapper = this._child;

        if (!el || !wrapper) {
            return;
        }

        const originalWidth = innerWidth(el);
        const originalHeight = innerHeight(el);

        if (originalHeight <= 0 || Number.isNaN(originalHeight)) {
            console.warn('Can not process element without height. Make sure the element is displayed and has a static height.');
            return;
        }

        if (originalWidth <= 0 || Number.isNaN(originalWidth)) {
            console.warn('Can not process element without width. Make sure the element is displayed and has a static width.');
            return;
        }

        const pid = uniqueId();
        this.pid = pid;

        const shouldCancelProcess = (): boolean => pid !== this.pid;

        const testPrimary = mode === 'multi'
            ? (): boolean => assertElementFitsHeight(wrapper, originalHeight)
            : (): boolean => assertElementFitsWidth(wrapper, originalWidth);

        const testSecondary = mode === 'multi'
            ? (): boolean => assertElementFitsWidth(wrapper, originalWidth)
            : (): boolean => assertElementFitsHeight(wrapper, originalHeight);

        let mid: number;
        let low = min || 1;
        let high = max || 100;

        this.setState({ ready: false });

        series([
            // Step 1:
            // Binary search to fit the element's height (multi line) / width (single line)
            (stepCallback: (err?: boolean) => void): void => whilst(
                (): boolean => low <= high,
                (whilstCallback: (err?: boolean) => void): void => {
                    if (shouldCancelProcess()) return whilstCallback(true);
                    mid = parseInt(((low + high) / 2).toString(), 10);
                    this.setState({ fontSize: mid }, () => {
                        if (shouldCancelProcess()) return whilstCallback(true);
                        if (testPrimary()) low = mid + 1;
                        else high = mid - 1;
                        return whilstCallback();
                    });
                },
                stepCallback
            ),
            // Step 2:
            // Binary search to fit the element's width (multi line) / height (single line)
            // If mode is single and forceSingleModeWidth is true, skip this step
            // in order to not fit the elements height and decrease the width
            (stepCallback: (err?: boolean) => void): void => {
                if (mode === 'single' && forceSingleModeWidth) return stepCallback();
                if (testSecondary()) return stepCallback();
                low = min || 1;
                high = mid!;
                return whilst(
                    (): boolean => low < high,
                    (whilstCallback: (err?: boolean) => void): void => {
                        if (shouldCancelProcess()) return whilstCallback(true);
                        mid = parseInt(((low + high) / 2).toString(), 10);
                        this.setState({ fontSize: mid }, () => {
                            if (pid !== this.pid) return whilstCallback(true);
                            if (testSecondary()) low = mid + 1;
                            else high = mid - 1;
                            return whilstCallback();
                        });
                    },
                    stepCallback
                );
            },
            // Step 3
            // Limits
            (stepCallback: (err?: boolean) => void): void => {
                // We break the previous loop without updating mid for the final time,
                // so we do it here:
                mid = Math.min(low, high);

                // Ensure we hit the user-supplied limits
                mid = Math.max(mid, min || 1);
                mid = Math.min(mid, max || 100);

                // Sanity check:
                mid = Math.max(mid, 0);

                if (shouldCancelProcess()) return stepCallback(true);
                this.setState({ fontSize: mid }, stepCallback);
            }
        ], (err?: boolean): void => {
            // err will be true, if another process was triggered
            if (err || shouldCancelProcess()) return;
            this.setState({ ready: true }, () => {
                if (onReady) onReady(mid!);
            });
        });
    }

    render(): ReactElement {
        const {
            children,
            text,
            style,
            min,
            max,
            mode,
            forceWidth,
            forceSingleModeWidth,
            /* eslint-disable @typescript-eslint/no-shadow */
            throttle,
            /* eslint-enable @typescript-eslint/no-shadow */
            autoResize,
            onReady,
            ...props
        } = this.props;
        const { fontSize, ready } = this.state;
        const finalStyle: CSSProperties = {
            ...style,
            fontSize: fontSize as number | undefined
        };

        const wrapperStyle: CSSProperties = {
            display: ready ? 'block' : 'inline-block'
        };
        if (mode === 'single') wrapperStyle.whiteSpace = 'nowrap';

        return (
            <div ref={(c): void => { this._parent = c; }} style={finalStyle} {...props}>
                <div ref={(c): void => { this._child = c; }} style={wrapperStyle}>
                    {text && typeof children === 'function'
                        ? ready
                            ? (children as (text: string) => ReactNode)(text)
                            : text
                        : children
                    }
                </div>
            </div>
        );
    }
}

export default Textfit;
